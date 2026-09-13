import { useMemo } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { habitDay, weekDates } from '../lib/habits';
import { dateString } from '../lib/format';
import type { Habit } from '../lib/types';
import { colors, fonts, numbers } from '../theme';
export function WeekStrip({selected,habits,allHabits,checks,onSelect,onWeek}:{selected:string;habits:Habit[];allHabits:Habit[];checks:Record<string,boolean>;onSelect:(date:string)=>void;onWeek:(direction:number)=>void}) {
 const days=useMemo(()=>weekDates(selected).map(date=>({date,count:habits.filter(h=>habitDay(h,date,allHabits,checks).satisfied).length})),[selected,habits,allHabits,checks]);
 const swipe=PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>25&&Math.abs(g.dx)>Math.abs(g.dy)*2,onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>40)onWeek(g.dx>0?-1:1);}});
 return <ScrollView horizontal style={{flexGrow:0,marginBottom:15}} contentContainerStyle={{flexGrow:1}}><View {...swipe.panHandlers} style={styles.strip}>{days.map(({date,count},i)=>{const future=date>dateString(),on=date===selected;return <Pressable key={date} accessibilityRole="button" accessibilityLabel={new Date(date+'T12:00:00').toDateString()} aria-pressed={on} accessibilityState={{selected:on,disabled:future}} disabled={future} onPress={()=>onSelect(date)} style={[styles.day,on&&styles.selected,future&&{opacity:0.4}]}><Text style={[styles.weekday,on&&styles.white]}>{['M','T','W','T','F','S','S'][i]}</Text><Text style={[styles.number,numbers,on&&styles.white]}>{Number(date.slice(-2))}</Text><View style={[styles.pip,{backgroundColor:count===habits.length?colors.moss:count?colors.amber:colors.transparent,borderColor:on?colors.surface:count?colors.transparent:colors.border2}]}/></Pressable>;})}</View></ScrollView>;
}
const styles=StyleSheet.create({strip:{flex:1,minWidth:338,flexDirection:'row',gap:5},day:{flex:1,minWidth:44,minHeight:74,borderRadius:13,alignItems:'center',justifyContent:'center',gap:6},selected:{backgroundColor:colors.moss},weekday:{fontFamily:fonts.medium,fontSize:11,color:colors.ink3},number:{fontFamily:fonts.semibold,fontSize:16,color:colors.ink},pip:{width:5,height:5,borderRadius:3,borderWidth:1},white:{color:colors.surface}});
