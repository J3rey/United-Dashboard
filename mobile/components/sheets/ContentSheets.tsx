import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { PILLAR_COLORS } from '../../lib/constants';
import { stages, stageColors, blankContent } from '../../lib/content';
import { dateLabel, dateString } from '../../lib/format';
import type { ContentStatus, Id } from '../../lib/types';
import { colors, numbers, type } from '../../theme';
import { Button, Chip, Field, Sheet, ui } from '../ui';
import { DatePicker } from '../DatePicker';
import { Icon } from '../Icon';
import { PillarSheet } from './PillarSheet';
function PillarChips({value,onChange}:{value:Id|null;onChange:(id:Id)=>void}) {const {state}=useData();return <View style={[ui.wrap,{marginBottom:14}]}>{state.pillars.map(p=><Chip key={p.id} label={p.name} color={(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text} selected={p.id===value} onPress={()=>onChange(p.id)}/>)}</View>;}
export function AddIdeaSheet({filter,onClose}:{filter:Id|'all';onClose:()=>void}) {
 const data=useData(),actions=useActions(),[idea,setIdea]=useState(''),[notes,setNotes]=useState(''),[pillarId,setPillarId]=useState<Id|null>(filter!=='all'?filter:data.state.pillars[0]?.id??null),[addPillar,setAddPillar]=useState(false),ideaInput=useRef<TextInput>(null);
 useEffect(()=>{if(!data.state.pillars.some(p=>p.id===pillarId))setPillarId(data.state.pillars[0]?.id??null);},[data.state.pillars,pillarId]);
 return <><Sheet title="New idea" onClose={onClose}><Field label="The idea" inputRef={ideaInput} autoFocus multiline scrollEnabled style={{height:82,textAlignVertical:'top'}} value={idea} onChangeText={setIdea}/><Text style={ui.label}>Pillar</Text>{data.state.pillars.length?<PillarChips value={pillarId} onChange={setPillarId}/>:<Button label="Create a pillar first" tone="quiet" onPress={()=>setAddPillar(true)}/>}<Field label="Notes · optional" multiline value={notes} onChangeText={setNotes}/><Button label="Add idea" disabled={!idea.trim()||!pillarId||actions.busy} onPress={async()=>{if(await actions.saveIdea({idea:idea.trim(),notes:notes.trim(),pillarId,status:'Idea',...blankContent})){setIdea('');setNotes('');ideaInput.current?.focus();}}}/></Sheet>{addPillar&&<PillarSheet onClose={()=>setAddPillar(false)}/>}</>;
}
export function StageSheet({value,onSelect,onClose}:{value:ContentStatus;onSelect:(s:ContentStatus)=>void;onClose:()=>void}) {const actions=useActions();return <Sheet title="Stage" onClose={onClose}>{stages.map(s=><Pressable key={s} accessibilityRole="button" aria-pressed={s===value} accessibilityState={{selected:s===value,disabled:actions.busy}} disabled={actions.busy} onPress={()=>onSelect(s)} style={[ui.editRow,{backgroundColor:s===value?stageColors[s].bg:colors.surface,paddingHorizontal:12,borderRadius:10}]}><View style={{width:9,height:9,borderRadius:5,backgroundColor:stageColors[s].text}}/><Text style={[type.body,numbers,ui.flex,{color:stageColors[s].text}]}>{s}</Text>{s===value&&<Icon name="check" color={stageColors[s].text}/>}</Pressable>)}</Sheet>;}
export function PillarPickerSheet({value,onSelect,onClose}:{value:Id|null;onSelect:(id:Id)=>void;onClose:()=>void}) {return <Sheet title="Pillar" onClose={onClose}><PillarChips value={value} onChange={onSelect}/></Sheet>;}
export function PostDateSheet({value,title,onSet,onClose}:{value:string;title:string;onSet:(date:string)=>void;onClose:()=>void}) {
 const [date,setDate]=useState(value||dateString());
 return <Sheet title="Post date" subtitle={title} onClose={onClose}><DatePicker value={date} onChange={setDate}/><Button label={`Set ${dateLabel(date,false)}`} onPress={()=>onSet(date)}/>{Boolean(value)&&<Button label="Clear date" tone="danger" onPress={()=>onSet('')}/>}</Sheet>;
}
