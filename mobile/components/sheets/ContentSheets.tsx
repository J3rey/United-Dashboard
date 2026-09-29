import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { PILLAR_COLORS } from '../../lib/constants';
import { stages, stageColors, blankContent } from '../../lib/content';
import { dateLabel, dateString } from '../../lib/format';
import type { ContentItem, ContentStatus, Id } from '../../lib/types';
import { colors, numbers, type } from '../../theme';
import { Button, Chip, Field, Sheet, ui } from '../ui';
import { DatePicker } from '../DatePicker';
import { Icon } from '../Icon';
import { ideaStyles } from '../IdeaCard';
import { PillarSheet } from './PillarSheet';
function PillarChips({value,onChange,disabled}:{value:Id|null;onChange:(id:Id)=>void;disabled?:boolean}) {const {state}=useData();return <View style={[ui.wrap,{marginBottom:14}]}>{state.pillars.map(p=><Chip key={p.id} label={p.name} color={(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text} selected={p.id===value} disabled={disabled} onPress={()=>onChange(p.id)}/>)}</View>;}
export function AddIdeaSheet({filter,postDate,onClose}:{filter:Id|'all';postDate?:string;onClose:()=>void}) {
 const data=useData(),actions=useActions(),[idea,setIdea]=useState(''),[notes,setNotes]=useState(''),[pillarId,setPillarId]=useState<Id|null>(filter!=='all'?filter:data.state.pillars[0]?.id??null),[addPillar,setAddPillar]=useState(false),ideaInput=useRef<TextInput>(null);
 useEffect(()=>{if(!data.state.pillars.some(p=>p.id===pillarId))setPillarId(data.state.pillars[0]?.id??null);},[data.state.pillars,pillarId]);
 return <><Sheet title="New idea" subtitle={postDate?`For ${dateLabel(postDate,false)}`:undefined} onClose={onClose}><Field label="The idea" inputRef={ideaInput} autoFocus multiline scrollEnabled style={{height:82,textAlignVertical:'top'}} value={idea} onChangeText={setIdea}/><Text style={ui.label}>Pillar</Text>{data.state.pillars.length?<PillarChips value={pillarId} onChange={setPillarId}/>:<Button label="Create a pillar first" tone="quiet" onPress={()=>setAddPillar(true)}/>}<Field label="Notes · optional" multiline value={notes} onChangeText={setNotes}/><Button label="Add idea" disabled={!idea.trim()||!pillarId||actions.busy} onPress={async()=>{if(await actions.saveIdea({idea:idea.trim(),notes:notes.trim(),pillarId,status:'Idea',...blankContent,postDate:postDate??''})){setIdea('');setNotes('');ideaInput.current?.focus();}}}/></Sheet>{addPillar&&<PillarSheet onClose={()=>setAddPillar(false)}/>}</>;
}
export function StageSheet({value,onSelect,onClose}:{value:ContentStatus;onSelect:(s:ContentStatus)=>void;onClose:()=>void}) {const actions=useActions();return <Sheet title="Stage" onClose={onClose}>{stages.map(s=><Pressable key={s} accessibilityRole="button" aria-pressed={s===value} accessibilityState={{selected:s===value,disabled:actions.busy}} disabled={actions.busy} onPress={()=>onSelect(s)} style={[ui.editRow,{backgroundColor:s===value?stageColors[s].bg:colors.surface,paddingHorizontal:12,borderRadius:10}]}><View style={{width:9,height:9,borderRadius:5,backgroundColor:stageColors[s].text}}/><Text style={[type.body,numbers,ui.flex,{color:stageColors[s].text}]}>{s}</Text>{s===value&&<Icon name="check" color={stageColors[s].text}/>}</Pressable>)}</Sheet>;}
export function PillarPickerSheet({value,onSelect,onClose}:{value:Id|null;onSelect:(id:Id)=>void;onClose:()=>void}) {const actions=useActions();return <Sheet title="Pillar" onClose={onClose}><PillarChips value={value} onChange={onSelect} disabled={actions.busy}/></Sheet>;}
export function PostDateSheet({value,title,onSet,onClose}:{value:string;title:string;onSet:(date:string)=>void;onClose:()=>void}) {
 const actions=useActions();
 const [date,setDate]=useState(value||dateString());
 return <Sheet title="Post date" subtitle={title} onClose={onClose}><DatePicker value={date} onChange={setDate}/><Button label={`Set ${dateLabel(date,false)}`} disabled={actions.busy} onPress={()=>onSet(date)}/>{Boolean(value)&&<Button label="Clear date" tone="danger" disabled={actions.busy} onPress={()=>onSet('')}/>}</Sheet>;
}
export function AddToDaySheet({date,items,onClose,onNew}:{date:string;items:ContentItem[];onClose:()=>void;onNew:()=>void}) {
 const data=useData(),actions=useActions();
 return <Sheet title={`Add to ${dateLabel(date,false)}`} subtitle="Pick an unscheduled idea, or start a new one." onClose={onClose}>
  {items.length?<View style={[ui.card,{marginBottom:8}]}>{items.map(c=>{const p=data.state.pillars.find(x=>x.id===c.pillarId),color=p?(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text:colors.border2,stage=stageColors[c.status];return <Pressable key={c.id} accessibilityRole="button" disabled={actions.busy} onPress={async()=>{if(await actions.editIdea(c.id,{postDate:date}))onClose();}} style={({pressed})=>[ui.editRow,{paddingHorizontal:14,backgroundColor:pressed?colors.surface2:colors.surface}]}><View style={{width:9,height:9,borderRadius:5,backgroundColor:color}}/><View style={ui.flex}><Text style={type.body}>{c.idea}</Text><Text style={type.subtitle}>{p?.name??'No pillar'}</Text></View><View style={[ideaStyles.badge,{backgroundColor:stage.bg}]}><Text style={[ideaStyles.badgeText,{color:stage.text}]}>{c.status}</Text></View></Pressable>;})}</View>:<Text style={[type.subtitle,{marginBottom:12}]}>Every idea has a date.</Text>}
  <Button label="New idea for this day" tone="quiet" onPress={onNew}/>
 </Sheet>;
}
export function PillarFilterSheet({onClose}:{onClose:()=>void}) {
 const data=useData(),filter=data.state.contentFilter,pick=(id:Id|'all')=>{data.setState(s=>({...s,contentFilter:id}));onClose();};
 return <Sheet title="Filter by pillar" onClose={onClose}><View style={[ui.wrap,{marginBottom:14}]}><Chip label="All" selected={filter==='all'} onPress={()=>pick('all')}/>{data.state.pillars.map(p=><Chip key={p.id} label={p.name} color={(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text} selected={filter===p.id} onPress={()=>pick(p.id)}/>)}</View></Sheet>;
}
