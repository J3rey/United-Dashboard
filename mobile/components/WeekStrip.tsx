import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { satisfiedCounts } from '../lib/habits';
import { dateString } from '../lib/format';
import type { Habit } from '../lib/types';
import { colors, fonts, numbers } from '../theme';
const DAY_W=44, GAP=5, SPAN=84; // days back from today, matches changeDay's floor
export function WeekStrip({selected,habits,allHabits,checks,onSelect}:{selected:string;habits:Habit[];allHabits:Habit[];checks:Record<string,boolean>;onSelect:(date:string)=>void}) {
 const today=dateString(), scroll=useRef<ScrollView>(null), [width,setWidth]=useState(0);
 const dates=useMemo(()=>Array.from({length:SPAN+1},(_,i)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-SPAN+i);return dateString(d);}),[today]);
 const counts=useMemo(()=>satisfiedCounts(dates,habits,allHabits,checks),[dates,habits,allHabits,checks]);
 const index=dates.indexOf(selected), total=habits.length;
 useEffect(()=>{if(width&&index>=0)scroll.current?.scrollTo({x:Math.max(0,index*(DAY_W+GAP)-width/2+DAY_W/2),animated:true});},[index,width]);
 return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} decelerationRate="normal" onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{flexGrow:0,marginBottom:15}} contentContainerStyle={styles.strip}>{dates.map((date,i)=><Day key={date} date={date} on={date===selected} pip={counts[i]===total?2:counts[i]?1:0} onSelect={onSelect}/>)}</ScrollView>;
}
const Day=memo(function Day({date,on,pip,onSelect}:{date:string;on:boolean;pip:0|1|2;onSelect:(date:string)=>void}) {
 const d=new Date(date+'T12:00:00');
 return <Pressable accessibilityRole="button" accessibilityLabel={d.toDateString()} aria-pressed={on} accessibilityState={{selected:on}} onPress={()=>onSelect(date)} style={[styles.day,on&&styles.selected]}><Text style={[styles.weekday,on&&styles.white]}>{'SMTWTFS'[d.getDay()]}</Text><Text style={[styles.number,numbers,on&&styles.white]}>{d.getDate()}</Text><View style={[styles.pip,{backgroundColor:pip===2?colors.moss:pip?colors.amber:colors.transparent,borderColor:on?colors.surface:pip?colors.transparent:colors.border2}]}/></Pressable>;
});
const styles=StyleSheet.create({strip:{flexDirection:'row',gap:GAP},day:{width:DAY_W,minHeight:74,borderRadius:13,alignItems:'center',justifyContent:'center',gap:6},selected:{backgroundColor:colors.moss},weekday:{fontFamily:fonts.medium,fontSize:11,color:colors.ink3},number:{fontFamily:fonts.semibold,fontSize:16,color:colors.ink},pip:{width:5,height:5,borderRadius:3,borderWidth:1},white:{color:colors.surface}});
