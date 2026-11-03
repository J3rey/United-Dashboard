import { toggleHabitLog, fetchHabitLogs } from '../lib/db';
import { habitDay, satisfiedCounts, weekDates } from '../lib/habits';
import { dateString } from '../lib/format';
import { supabase } from '../lib/supabase';
jest.mock('../lib/supabase', () => ({ supabase: { from: jest.fn() } }));
test.each([['2026-09-08','2026-09-07',1],['2027-01-01','2026-12-28',4],['2026-03-01','2026-02-23',6]])('writes selected %s using Monday and day index', async (date, monday, index) => {
 const upsert = jest.fn().mockResolvedValue({ error: null }); jest.mocked(supabase.from).mockReturnValue({ upsert } as never);
 await toggleHabitLog('owner',42,date,true);
 expect(upsert).toHaveBeenCalledWith({ user_id:'owner',habit_id:42,week_start:monday,day_index:index,checked:true },{ onConflict:'habit_id,week_start,day_index' });
 const eq = jest.fn().mockResolvedValue({ data:[{habit_id:42,week_start:monday,day_index:index}],error:null });
 jest.mocked(supabase.from).mockReturnValue({ select: () => ({eq}) } as never);
 expect(await fetchHabitLogs('owner')).toEqual({[`42_${date}`]:true});
});
test('weekly goal satisfaction does not manufacture a real check', () => {
 const habit = {id:1,name:'Read',type:'weekly' as const,daily:false,goal:2};
 expect(habitDay(habit,'2026-09-12',[habit],{'1_2026-09-07':true,'1_2026-09-08':true})).toMatchObject({ checked:false, satisfied:true, state:'empty', count:2 });
 expect(weekDates('2027-01-01')[0]).toBe('2026-12-28');
});
test('satisfiedCounts matches habitDay over weeks, gym inheritance and week boundaries', () => {
 let seed=7; const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
 const all = [
  {id:1,name:'Gym',type:'weekly' as const,daily:false,goal:3}, {id:2,name:'Physical exercise',type:'weekly' as const,daily:false,goal:2},
  {id:3,name:'Read',type:'daily' as const,daily:true,goal:7}, {id:4,name:'Write',type:'weekly' as const,daily:false,goal:4}, {id:5,name:'Floss',type:'daily' as const,daily:true,goal:7},
 ];
 const dates = Array.from({length:12*7+3},(_,i)=>{const d=new Date('2026-08-01T12:00:00'); d.setDate(d.getDate()+i); return dateString(d);});
 const checks: Record<string,boolean> = {};
 for (const h of all) for (const d of dates) if (rnd()<0.35) checks[`${h.id}_${d}`]=true;
 for (const habits of [all, all.filter(h=>h.id!==1), all.slice(1,4), []]) {
  expect(satisfiedCounts(dates,habits,all,checks)).toEqual(dates.map(d=>habits.filter(h=>habitDay(h,d,all,checks).satisfied).length));
 }
 expect(satisfiedCounts(dates,all.slice(1),all.slice(1),checks)).toEqual(dates.map(d=>all.slice(1).filter(h=>habitDay(h,d,all.slice(1),checks).satisfied).length));
});
