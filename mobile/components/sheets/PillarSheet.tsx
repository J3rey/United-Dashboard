import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PILLAR_COLORS } from '../../lib/constants';
import type { Pillar } from '../../lib/types';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { Button, Field, Sheet, ui } from '../ui';
import { colors, numbers } from '../../theme';
import { ideaStyles } from '../IdeaCard';
export function PillarSheet({pillar,onClose}:{pillar?:Pillar;onClose:()=>void}) {
 const data=useData(),actions=useActions(),[name,setName]=useState(pillar?.name??''),[colorIdx,setColorIdx]=useState(pillar?.colorIdx??Math.max(0,PILLAR_COLORS.findIndex((_,i)=>!data.state.pillars.some(p=>p.colorIdx===i))));
 const color=PILLAR_COLORS[colorIdx]??PILLAR_COLORS[0]!;
 return <Sheet title={pillar?'Edit pillar':'New pillar'} onClose={onClose}><Field label="Pillar name" autoFocus value={name} onChangeText={setName}/><Text style={ui.label}>Colour</Text><View style={[ui.wrap,{marginBottom:18}]}>{PILLAR_COLORS.map((pair,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={`Colour ${i+1}`} aria-pressed={i===colorIdx} accessibilityState={{selected:i===colorIdx}} onPress={()=>setColorIdx(i)} style={{width:44,height:44,borderRadius:15,borderWidth:i===colorIdx?2:0,borderColor:colors.ink,alignItems:'center',justifyContent:'center'}}><View style={{width:30,height:30,borderRadius:10,backgroundColor:pair.text}}/></Pressable>)}</View><Text style={ui.label}>Preview</Text><View style={[ideaStyles.card,{borderLeftColor:color.text,marginBottom:18}]}><Text style={ideaStyles.title}>An idea in this pillar</Text><View style={[ideaStyles.badge,{backgroundColor:color.bg,alignSelf:'flex-start'}]}><Text style={[ideaStyles.badgeText,numbers,{color:color.text}]}>{name.trim()||'Pillar name'}</Text></View></View><Button label={pillar?'Save changes':'Add pillar'} disabled={!name.trim()||actions.busy} onPress={async()=>{if(await actions.savePillar({name:name.trim(),colorIdx},pillar?.id))onClose();}}/></Sheet>;
}
