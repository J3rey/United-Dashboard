import { Alert } from '../../lib/alert';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, EditRow, Field, IconButton, Sheet, ui } from '../ui';
import { useActions } from '../../hooks/useActions';
import type { Habit } from '../../lib/types';
import { numbers, type } from '../../theme';
export function GoalStepper({value,onChange}:{value:number;onChange:(goal:number)=>void}) {return <View style={ui.line}><IconButton name="back" label="Decrease goal" disabled={value<=1} onPress={()=>onChange(value-1)}/><Text style={[type.title,numbers,ui.flex,{textAlign:'center'}]}>{value}</Text><IconButton name="plus" label="Increase goal" disabled={value>=7} onPress={()=>onChange(value+1)}/></View>;}
export function confirmDeleteHabit(habit:Habit,remove:()=>void) {Alert.alert(`Delete ${habit.name}?`,'This also deletes its check history. Archive keeps it.',[{text:'Cancel',style:'cancel'},{text:'Delete habit',style:'destructive',onPress:remove}]);}
export function AddHabitSheet({onClose}:{onClose:()=>void}) {
 const actions=useActions(),[name,setName]=useState(''),[daily,setDaily]=useState(false),[goal,setGoal]=useState(3);
 return <Sheet title="New habit" onClose={onClose}><Field label="What are you tracking" autoFocus value={name} onChangeText={setName}/><Text style={ui.label}>How often</Text><View style={[ui.wrap,{marginBottom:16}]}><Chip label="A few times a week" selected={!daily} onPress={()=>setDaily(false)}/><Chip label="Every day" selected={daily} onPress={()=>setDaily(true)}/></View>{!daily&&<><Text style={ui.label}>Times per week</Text><GoalStepper value={goal} onChange={setGoal}/></>}<Button label="Add habit" disabled={!name.trim()||actions.busy} onPress={async()=>{if(await actions.saveHabit({name:name.trim(),daily,type:daily?'daily':'weekly',goal:daily?7:goal}))onClose();}}/></Sheet>;
}
export function HabitActionsSheet({habit,count,onClose}:{habit:Habit;count:number;onClose:()=>void}) {
 const actions=useActions(),[editing,setEditing]=useState<'name'|'goal'|null>(null),[name,setName]=useState(habit.name),[goal,setGoal]=useState(habit.goal);
 const saved=useRef(habit.name),pending=useRef<Promise<boolean>|null>(null);
 async function saveDraft() {
  if(pending.current&&!await pending.current)return false;
  const value=name.trim();
  if(!value||value===saved.current)return true;
  const request=actions.editHabit(habit.id,{name:value}).then(ok=>{if(ok)saved.current=value;return ok;});
  pending.current=request;
  try{return await request;}finally{if(pending.current===request)pending.current=null;}
 }
 const close=async(done=onClose)=>{if(await saveDraft())done();};
 return <Sheet title={habit.name} subtitle={`${habit.daily?'Every day':`${habit.goal} times a week`} · ${count} of ${habit.daily?7:habit.goal} done`} onClose={onClose} confirmClose={done=>{void close(done);}}>
 {editing==='name'?<Field label="Rename" autoFocus value={name} onChangeText={setName} onBlur={async()=>{if(await saveDraft())setEditing(null);}}/>:<EditRow label="Rename" value="" onPress={()=>setEditing('name')}/>}
 {!habit.daily&&(editing==='goal'?<><GoalStepper value={goal} onChange={setGoal}/><Button label="Set goal" disabled={actions.busy} onPress={async()=>{if(await actions.editHabit(habit.id,{goal}))setEditing(null);}}/></>:<EditRow label="Change goal" value={`${habit.goal} a week`} onPress={()=>setEditing('goal')}/>)}
 <Button label="Archive" tone="quiet" disabled={actions.busy} onPress={async()=>{if(await saveDraft()){actions.archiveHabit(habit.id);onClose();}}}/><Button label="Delete habit" tone="danger" disabled={actions.busy} onPress={()=>confirmDeleteHabit(habit,async()=>{if(await actions.deleteHabit(habit.id))onClose();})}/><Button label="Cancel" tone="quiet" disabled={actions.busy} onPress={()=>{void close();}}/></Sheet>;
}
