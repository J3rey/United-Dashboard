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
 return {checked,inherited,count,goal,satisfied:checked||inherited||goalMet,state:checked?'checked' as const:inherited||goalMet?'goal' as const:'empty' as const};
}
