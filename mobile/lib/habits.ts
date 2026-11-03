import { dateString } from './format';
import type { Habit, Id } from './types';
export function weekDates(date: string, offset = 0) {
 const d = new Date(date+'T12:00:00'); d.setDate(d.getDate() - (d.getDay()+6)%7 + offset*7);
 return Array.from({length:7},(_,i) => { const day=new Date(d); day.setDate(d.getDate()+i); return dateString(day); });
}
export function checkedOn(id: Id,date: string,habits: Habit[],checks: Record<string,boolean>) {
 const habit=habits.find(h=>h.id===id), gym=habits.find(h=>/^gym\b/i.test(h.name));
 return Boolean(checks[`${id}_${date}`] || (habit && /physical exercise/i.test(habit.name) && gym && checks[`${gym.id}_${date}`]));
}
export function habitDay(habit: Habit,date: string,habits: Habit[],checks: Record<string,boolean>) {
 const checked=Boolean(checks[`${habit.id}_${date}`]), inherited=!checked && checkedOn(habit.id,date,habits,checks);
 const count=weekDates(date).filter(d=>checkedOn(habit.id,d,habits,checks)).length;
 const goal=habit.daily?7:habit.goal, goalMet=!habit.daily && count>=goal;
 return {checked,inherited,count,goal,satisfied:checked||inherited||goalMet,state:checked||inherited?'checked' as const:'empty' as const};
}
export function satisfiedCounts(dates: string[],habits: Habit[],allHabits: Habit[],checks: Record<string,boolean>) {
 const gym=allHabits.find(h=>/^gym\b/i.test(h.name)), weeks=new Map<string,{days:string[];counts:number[]}>();
 const info=habits.map(h=>{const known=allHabits.find(x=>x.id===h.id); return {h,inherits:Boolean(known && gym && /physical exercise/i.test(known.name))};});
 const on=(i: number,d: string)=>Boolean(checks[`${info[i].h.id}_${d}`] || (info[i].inherits && checks[`${gym!.id}_${d}`]));
 return dates.map(date=>{
  const m=new Date(date+'T12:00:00'); m.setDate(m.getDate()-(m.getDay()+6)%7); const monday=dateString(m);
  let week=weeks.get(monday);
  if (!week) { const days=weekDates(monday); week={days,counts:info.map((_,i)=>days.filter(d=>on(i,d)).length)}; weeks.set(monday,week); }
  let n=0;
  for (let i=0;i<info.length;i++) { const h=info[i].h; if (on(i,date) || (!h.daily && week.counts[i]>=h.goal)) n++; }
  return n;
 });
}
