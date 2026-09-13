import { Alert } from '../../lib/alert';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { PILLAR_COLORS } from '../../lib/constants';
import { stages, stageColors } from '../../lib/content';
import type { ContentItem, ContentStatus, Id } from '../../lib/types';
import { colors, numbers, type } from '../../theme';
import { Button, Chip, EditRow, Field, Sheet, ui } from '../ui';
import { Icon } from '../Icon';
import { PillarSheet } from './PillarSheet';
function PillarChips({value,onChange}:{value:Id|null;onChange:(id:Id)=>void}) {const {state}=useData();return <View style={[ui.wrap,{marginBottom:14}]}>{state.pillars.map(p=><Chip key={p.id} label={p.name} color={(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text} selected={p.id===value} onPress={()=>onChange(p.id)}/>)}</View>;}
export function AddIdeaSheet({filter,onClose}:{filter:Id|'all';onClose:()=>void}) {
 const data=useData(),actions=useActions(),[idea,setIdea]=useState(''),[notes,setNotes]=useState(''),[pillarId,setPillarId]=useState<Id|null>(filter!=='all'?filter:data.state.pillars[0]?.id??null),[addPillar,setAddPillar]=useState(false),ideaInput=useRef<TextInput>(null);
 useEffect(()=>{if(!data.state.pillars.some(p=>p.id===pillarId))setPillarId(data.state.pillars[0]?.id??null);},[data.state.pillars,pillarId]);
 return <><Sheet title="New idea" onClose={onClose}><Field label="The idea" inputRef={ideaInput} autoFocus multiline scrollEnabled style={{height:82,textAlignVertical:'top'}} value={idea} onChangeText={setIdea}/><Text style={ui.label}>Pillar</Text>{data.state.pillars.length?<PillarChips value={pillarId} onChange={setPillarId}/>:<Button label="Create a pillar first" tone="quiet" onPress={()=>setAddPillar(true)}/>}<Field label="Notes · optional" multiline value={notes} onChangeText={setNotes}/><Button label="Add idea" disabled={!idea.trim()||!pillarId||actions.busy} onPress={async()=>{if(await actions.saveIdea({idea:idea.trim(),notes:notes.trim(),pillarId,status:'Idea'})){setIdea('');setNotes('');ideaInput.current?.focus();}}}/></Sheet>{addPillar&&<PillarSheet onClose={()=>setAddPillar(false)}/>}</>;
}
export function IdeaDetailSheet({item,onClose}:{item:ContentItem;onClose:()=>void}) {
 const data=useData(),actions=useActions(),[editing,setEditing]=useState<'idea'|'pillar'|null>(null),[idea,setIdea]=useState(item.idea),[notes,setNotes]=useState(item.notes),[picker,setPicker]=useState(false),index=stages.indexOf(item.status),next=stages[index+1],stage=stageColors[item.status];
 const saved=useRef({idea:item.idea,notes:item.notes}),pending=useRef<Promise<boolean>|null>(null);
 async function saveDraft() {
  if(pending.current&&!await pending.current)return false;
  const changes:Parameters<typeof actions.editIdea>[1]={};
  if(idea.trim()&&idea.trim()!==saved.current.idea)changes.idea=idea.trim();
  if(notes!==saved.current.notes)changes.notes=notes;
  if(!Object.keys(changes).length)return true;
  const request=actions.editIdea(item.id,changes).then(ok=>{if(ok)saved.current={...saved.current,...changes};return ok;});
  pending.current=request;
  try{return await request;}finally{if(pending.current===request)pending.current=null;}
 }
 const close=async(done=onClose)=>{if(await saveDraft())done();};
 return <><Sheet title="Idea detail" onClose={onClose} confirmClose={done=>{void close(done);}}><Text style={[type.sheetTitle,{marginVertical:10}]}>{item.idea}</Text><View style={[ui.line,{gap:4,marginBottom:9}]}>{stages.map((s,i)=><View key={s} style={{height:5,flex:1,borderRadius:3,backgroundColor:i<=index?stageColors[s].text:colors.border}}/>)}</View><View style={[ui.line,{marginBottom:16}]}><Chip label={item.status} selected color={stage.text} onPress={()=>setPicker(true)}/></View>
 {editing==='idea'?<Field label="The idea" multiline autoFocus value={idea} onChangeText={setIdea} onBlur={async()=>{if(await saveDraft())setEditing(null);}}/>:<EditRow label="Idea" value="Edit" onPress={()=>setEditing('idea')}/>}
 {editing==='pillar'?<PillarChips value={item.pillarId} onChange={async id=>{if(await actions.editIdea(item.id,{pillarId:id}))setEditing(null);}}/>:<EditRow label="Pillar" value={data.state.pillars.find(p=>p.id===item.pillarId)?.name??'No pillar'} onPress={()=>setEditing('pillar')}/>}
 <Field label="Notes · optional" multiline style={{minHeight:100,textAlignVertical:'top',marginTop:12}} value={notes} onChangeText={setNotes} onBlur={()=>{void saveDraft();}}/>{next&&<Button label={`Mark as ${next.toLowerCase()}`} disabled={actions.busy} onPress={async()=>{if(await saveDraft()&&await actions.editIdea(item.id,{status:next}))onClose();}}/>}<Button label="Delete idea" tone="danger" disabled={actions.busy} onPress={()=>Alert.alert('Delete idea?','You can undo this for four seconds.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{actions.deleteIdea(item.id);onClose();}}])}/><Button label="Done" tone="quiet" disabled={actions.busy} onPress={()=>{void close();}}/></Sheet>
 {picker&&<StageSheet value={item.status} onClose={()=>setPicker(false)} onSelect={async status=>{if(await saveDraft()&&await actions.editIdea(item.id,{status})){setPicker(false);onClose();}}}/>}</>;
}
function StageSheet({value,onSelect,onClose}:{value:ContentStatus;onSelect:(s:ContentStatus)=>void;onClose:()=>void}) {const actions=useActions();return <Sheet title="Stage" onClose={onClose}>{stages.map(s=><Pressable key={s} accessibilityRole="button" aria-pressed={s===value} accessibilityState={{selected:s===value,disabled:actions.busy}} disabled={actions.busy} onPress={()=>onSelect(s)} style={[ui.editRow,{backgroundColor:s===value?stageColors[s].bg:colors.surface,paddingHorizontal:12,borderRadius:10}]}><View style={{width:9,height:9,borderRadius:5,backgroundColor:stageColors[s].text}}/><Text style={[type.body,numbers,ui.flex,{color:stageColors[s].text}]}>{s}</Text>{s===value&&<Icon name="check" color={stageColors[s].text}/>}</Pressable>)}</Sheet>;}
