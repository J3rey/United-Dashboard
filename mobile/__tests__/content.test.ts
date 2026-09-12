import { mergePipelineOrder } from '../lib/content';
import type { ContentItem } from '../lib/types';
const item=(id:number,status:ContentItem['status']='Idea'):ContentItem=>({id,status,idea:String(id),notes:'',pillarId:null});
test('dragging active ideas preserves posted rows and the entire order',()=>{
 const original=[item(1),item(2,'Posted'),item(3),item(4,'Posted'),item(5)];
 expect(mergePipelineOrder(original,[original[4]!,original[0]!,original[2]!]).map(x=>x.id)).toEqual([5,2,1,4,3]);
});
