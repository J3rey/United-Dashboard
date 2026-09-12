const mockFrom=jest.fn();
jest.mock('../lib/supabase',()=>({supabase:{from:(table:string)=>mockFrom(table)}}));
jest.mock('../lib/db',()=>({insertTransaction:jest.fn(),deleteTransaction:jest.fn()}));
import { deleteHabit, updateContentPositions, insertOrderedTransaction } from '../lib/nativeDb';
import * as db from '../lib/db';
import type { ContentItem } from '../lib/types';
beforeEach(()=>{mockFrom.mockReset();});
test('a failed habit deletion restores its existing check history',async()=>{
 const log={user_id:'owner',habit_id:7,week_start:'2026-09-07',day_index:1,checked:true};
 const restore=jest.fn().mockResolvedValue({error:null});
 const logs={select:()=>({eq:()=>({eq:async()=>({data:[log],error:null})})}),delete:()=>({eq:()=>({eq:async()=>({error:null})})}),upsert:restore};
 mockFrom.mockImplementation(table=>table==='habit_logs'?logs:{delete:()=>({eq:()=>({eq:async()=>({error:new Error('Offline')})})})});
 await expect(deleteHabit('owner',7)).rejects.toThrow('Offline');
 expect(restore).toHaveBeenCalledWith([log],{onConflict:'habit_id,week_start,day_index'});
});
test('reorder writes only affected positions',async()=>{
 const update=jest.fn(()=>({eq:jest.fn().mockResolvedValue({error:null})}));mockFrom.mockReturnValue({update});
 const row=(id:number):ContentItem=>({id,idea:'Idea',pillarId:null,notes:'',status:'Idea'}),before=[row(1),row(2),row(3)];
 await updateContentPositions(before,[before[1]!,before[0]!,before[2]!]);
 expect(update.mock.calls).toEqual([[{sort_order:0}],[{sort_order:1}]]);
});
test('failed inserted-row ordering removes the inserted row',async()=>{
 jest.mocked(db.insertTransaction).mockResolvedValue(99);jest.mocked(db.deleteTransaction).mockResolvedValue();
 mockFrom.mockReturnValue({update:()=>({eq:()=>({eq:async()=>({error:new Error('Order failed')})})})});
 const entry={id:'temp',isHeader:true as const,date:'2026-09-12',label:'Trip'};
 await expect(insertOrderedTransaction('owner',entry,[entry])).rejects.toThrow('Order failed');
 expect(db.deleteTransaction).toHaveBeenCalledWith(99);
});
