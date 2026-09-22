import { useEffect, useMemo, useState } from 'react';
import { PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { Page } from '../../../components/TabShell';
import { WeekStrip } from '../../../components/WeekStrip';
import { HabitCheck } from '../../../components/HabitCheck';
import { AddHabitSheet, HabitActionsSheet } from '../../../components/sheets/HabitSheets';
import { Button, EmptyState, Fab, IconButton, ui } from '../../../components/ui';
import { Icon } from '../../../components/Icon';
import { dateString } from '../../../lib/format';
import { habitDay, weekDates } from '../../../lib/habits';
import type { Id } from '../../../lib/types';
import { colors, numbers, type } from '../../../theme';
const AnimatedCircle=Animated.createAnimatedComponent(Circle);
function Ring({done,total,past}:{done:number;total:number;past:boolean}) {
 const reduced=useReducedMotion(),progress=useSharedValue(done/total),circumference=2*Math.PI*19;
 useEffect(()=>{progress.value=reduced?done/total:withTiming(done/total,{duration:250});},[done,total,reduced,progress]);
 const props=useAnimatedProps(()=>({strokeDashoffset:circumference*(1-progress.value)}));
 return <View style={styles.ring} accessibilityLabel={`${done} of ${total} habits satisfied`}><Svg width={46} height={46}><Circle cx={23} cy={23} r={19} stroke={colors.border} strokeWidth={5} fill="none"/><AnimatedCircle cx={23} cy={23} r={19} stroke={done===total?colors.moss:colors.amber} strokeWidth={5} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeLinecap="round" rotation={-90} origin="23,23" animatedProps={props}/></Svg><View style={styles.ringLabel}>{done===total?<Icon name="check" color={colors.moss} size={17}/>:<Text style={[type.label,numbers,{fontSize:11}]}>{done}/{total}</Text>}</View></View>;
}
export default function Habits() {
 const router=useRouter(),data=useData(),actions=useActions(),today=dateString(),[selected,setSelected]=useState(today),[add,setAdd]=useState(false),[detailId,setDetailId]=useState<Id|null>(null);
 const habits=useMemo(()=>data.state.habits.filter(h=>!h.archived),[data.state.habits]),checks=data.state.habitChecks,past=selected!==today;
 const statuses=useMemo(()=>habits.map(h=>({habit:h,...habitDay(h,selected,data.state.habits,checks)})),[habits,selected,data.state.habits,checks]);
 const sorted=useMemo(()=>[...statuses].sort((a,b)=>Number(a.habit.daily)-Number(b.habit.daily)),[statuses]);
 const done=statuses.filter(h=>h.satisfied).length,detail=data.state.habits.find(h=>h.id===detailId);
 function changeDay(delta:number){const d=new Date(selected+'T12:00:00');d.setDate(d.getDate()+delta);const next=dateString(d),min=new Date(today+'T12:00:00');min.setDate(min.getDate()-84);if(next<=today&&next>=dateString(min))setSelected(next);}
 const swipe=PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>25&&Math.abs(g.dx)>Math.abs(g.dy)*2,onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>40)changeDay(g.dx>0?-1:1);}});
 const date=new Date(selected+'T12:00:00'),daysAgo=Math.round((new Date(today+'T12:00:00').getTime()-date.getTime())/86400000);
 return <Page title="Habits" actions={habits.length>0&&data.state.habits.some(h=>h.archived)?<IconButton name="archive" label="Archived habits" onPress={()=>router.push('/habits/archived')}/>:undefined}>
 <ScrollView contentContainerStyle={[ui.gutter,{paddingBottom:100}]} refreshControl={<RefreshControl refreshing={false} onRefresh={data.refetch} tintColor={colors.moss}/>}>{!habits.length?<EmptyState title="No habits yet" copy="Add something you want to do a few times a week, or every day. You’ll tick it off here." action="Add your first habit" onPress={()=>setAdd(true)}/>:<>
 <WeekStrip selected={selected} habits={habits} allHabits={data.state.habits} checks={checks} onSelect={setSelected}/>
 <View style={ui.card} {...swipe.panHandlers}><View style={styles.heading}><Ring done={done} total={habits.length} past={past}/><View style={ui.flex}><Text style={[type.sheetTitle,numbers]}>{done===habits.length?`All ${habits.length===6?'six':habits.length} done`:past?date.toLocaleDateString('en-AU',{weekday:'long'}):'Today'}</Text><Text style={[type.subtitle,numbers]}>{date.toLocaleDateString('en-AU',{day:'numeric',month:'long',...(past?{}:{weekday:'long'})})}{past?` · ${daysAgo} ${daysAgo===1?'day':'days'} ago`:''}</Text></View>{past&&<Button label="Today" tone="quiet" onPress={()=>setSelected(today)}/>}</View>
 {sorted.map(item=><View key={item.habit.id} style={styles.row}><HabitCheck state={item.state} label={`${item.habit.name}, ${item.checked||item.inherited?'checked':'not checked'}`} disabled={actions.busy||item.inherited} onPress={async()=>{const wasComplete=done===habits.length;const next={...checks,[`${item.habit.id}_${selected}`]:!item.checked};const completes=habits.every(h=>habitDay(h,selected,data.state.habits,next).satisfied);if(await actions.toggleHabit(item.habit.id,selected)&&!wasComplete&&completes)Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);}}/><Pressable accessibilityRole="button" onPress={()=>setDetailId(item.habit.id)} onLongPress={()=>setDetailId(item.habit.id)} style={styles.name}><Text style={[type.body,item.satisfied&&{color:colors.ink2}]}>{item.habit.name}</Text><Text style={[type.subtitle,numbers]}>{item.habit.daily?`every day · ${past&&!item.checked&&!item.inherited?'missed':`${item.count} of 7 this week`}`:past&&item.checked?'counted toward this week':`${item.count} of ${item.goal} this week${item.satisfied?' — done':''}`}</Text></Pressable>{!item.satisfied&&!item.habit.daily&&<Text style={[type.label,numbers,styles.remaining]}>{Math.max(0,item.goal-item.count)} to go</Text>}</View>)}
 </View><View style={[ui.card,{padding:14}]}><Text style={[type.body,{marginBottom:16}]}>{weekDates(selected)[0]===weekDates(today)[0]?'This week':'That week'}</Text>{statuses.map(item=><View key={item.habit.id} style={{marginBottom:13}}><View style={[ui.line,{marginBottom:6}]}><Text style={[type.subtitle,ui.flex]}>{item.habit.name}</Text><Text style={[type.subtitle,numbers]}>{item.count}/{item.goal}</Text></View><View style={styles.track}><View style={[styles.bar,{width:`${Math.min(1,item.count/item.goal)*100}%`,backgroundColor:item.count>=item.goal?colors.moss:colors.amber}]}/></View></View>)}</View></>}
 </ScrollView><Fab label="Add habit" onPress={()=>setAdd(true)}/>{add&&<AddHabitSheet onClose={()=>setAdd(false)}/>}{detail&&<HabitActionsSheet habit={detail} count={habitDay(detail,selected,data.state.habits,checks).count} onClose={()=>setDetailId(null)}/>}</Page>;
}
const styles=StyleSheet.create({ring:{width:46,height:46},ringLabel:{position:'absolute',inset:0,alignItems:'center',justifyContent:'center'},heading:{flexDirection:'row',alignItems:'center',gap:11,padding:14,borderBottomWidth:1,borderColor:colors.border},row:{minHeight:56,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:9},name:{flex:1,minHeight:56,justifyContent:'center',gap:3},remaining:{backgroundColor:colors.surface2,borderRadius:6,padding:5},track:{height:5,backgroundColor:colors.border,borderRadius:4,overflow:'hidden'},bar:{height:5,borderRadius:4}});
