import { Alert } from '../../../lib/alert';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Page } from '../../../components/TabShell';
import { Button, IconButton, ui } from '../../../components/ui';
import { PillarSheet } from '../../../components/sheets/PillarSheet';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { PILLAR_COLORS } from '../../../lib/constants';
import type { Pillar } from '../../../lib/types';
import { colors, numbers, type } from '../../../theme';
export default function Pillars(){const data=useData(),actions=useActions(),[edit,setEdit]=useState<Pillar|'new'|null>(null);function remove(p:Pillar){const count=data.state.content.filter(c=>c.pillarId===p.id).length;if(count)Alert.alert(`Delete ${p.name}?`,`${count} ${count===1?'idea uses':'ideas use'} ${p.name}. They’ll keep their notes but lose their pillar.`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{void actions.deletePillar(p.id);}}]);else void actions.deletePillar(p.id);}return <Page title="Content pillars" back actions={<IconButton name="plus" label="Add pillar" onPress={()=>setEdit('new')}/>}><ScrollView contentContainerStyle={[ui.gutter,{paddingTop:16,paddingBottom:24}]}><View style={ui.card}>{data.state.pillars.map(p=>{const color=PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!,count=data.state.content.filter(c=>c.pillarId===p.id).length;return <ReanimatedSwipeable key={p.id} renderRightActions={()=> <Button label="Delete" tone="danger" disabled={actions.busy} onPress={()=>remove(p)}/>}><Pressable accessibilityRole="button" onPress={()=>setEdit(p)} style={[ui.editRow,{paddingHorizontal:14,backgroundColor:colors.surface}]}><View style={{width:28,height:28,borderRadius:9,backgroundColor:color.text}}/><Text style={[type.body,ui.flex]}>{p.name}</Text><Text style={[type.subtitle,numbers]}>{count} {count===1?'idea':'ideas'}</Text></Pressable></ReanimatedSwipeable>;})}</View><Button label="Add pillar" tone="quiet" onPress={()=>setEdit('new')}/></ScrollView>{edit&&<PillarSheet pillar={edit==='new'?undefined:edit} onClose={()=>setEdit(null)}/>}</Page>;}
