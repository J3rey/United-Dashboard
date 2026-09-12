import { toggleHabitLog, fetchHabitLogs } from '../lib/db';
import { habitDay, weekDates } from '../lib/habits';
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
 expect(habitDay(habit,'2026-09-12',[habit],{'1_2026-09-07':true,'1_2026-09-08':true})).toMatchObject({ checked:false, satisfied:true, state:'goal', count:2 });
 expect(weekDates('2027-01-01')[0]).toBe('2026-12-28');
});
