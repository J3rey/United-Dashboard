import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { habitDay } from '../lib/habits';
import { dateString } from '../lib/format';
import type { Habit } from '../lib/types';
import { colors, fonts, numbers } from '../theme';
const DAY_W=44, GAP=5, SPAN=84; // days back from today, matches changeDay's floor
export function WeekStrip({selected,habits,allHabits,checks,onSelect}:{selected:string;habits:Habit[];allHabits:Habit[];checks:Record<string,boolean>;onSelect:(date:string)=>void}) {
 const today=dateString(), scroll=useRef<ScrollView>(null), [width,setWidth]=useState(0);
 const days=useMemo(()=>Array.from({length:SPAN+1},(_,i)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-SPAN+i);const date=dateString(d);return {date,count:habits.filter(h=>habitDay(h,date,allHabits,checks).satisfied).length};}),[today,habits,allHabits,checks]);
 const index=days.findIndex(d=>d.date===selected);
 useEffect(()=>{if(width&&index>=0)scroll.current?.scrollTo({x:Math.max(0,index*(DAY_W+GAP)-width/2+DAY_W/2),animated:true});},[index,width]);
 return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} decelerationRate="normal" onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{flexGrow:0,marginBottom:15}} contentContainerStyle={styles.strip}>{days.map(({date,count})=>{const on=date===selected,d=new Date(date+'T12:00:00');return <Pressable key={date} accessibilityRole="button" accessibilityLabel={d.toDateString()} aria-pressed={on} accessibilityState={{selected:on}} onPress={()=>onSelect(date)} style={[styles.day,on&&styles.selected]}><Text style={[styles.weekday,on&&styles.white]}>{'SMTWTFS'[d.getDay()]}</Text><Text style={[styles.number,numbers,on&&styles.white]}>{d.getDate()}</Text><View style={[styles.pip,{backgroundColor:count===habits.length?colors.moss:count?colors.amber:colors.transparent,borderColor:on?colors.surface:count?colors.transparent:colors.border2}]}/></Pressable>;})}</ScrollView>;
}
const styles=StyleSheet.create({strip:{flexDirection:'row',gap:GAP},day:{width:DAY_W,minHeight:74,borderRadius:13,alignItems:'center',justifyContent:'center',gap:6},selected:{backgroundColor:colors.moss},weekday:{fontFamily:fonts.medium,fontSize:11,color:colors.ink3},number:{fontFamily:fonts.semibold,fontSize:16,color:colors.ink},pip:{width:5,height:5,borderRadius:3,borderWidth:1},white:{color:colors.surface}});
