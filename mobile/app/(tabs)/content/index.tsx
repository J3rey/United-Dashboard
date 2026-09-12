import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { ReduceMotion } from 'react-native-reanimated';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Page } from '../../../components/TabShell';
import { IdeaCard } from '../../../components/IdeaCard';
import { Button, Chip, EmptyState, Fab, IconButton, ui } from '../../../components/ui';
import { AddIdeaSheet, IdeaDetailSheet } from '../../../components/sheets/ContentSheets';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { PILLAR_COLORS } from '../../../lib/constants';
import { mergePipelineOrder } from '../../../lib/content';
import type { Id } from '../../../lib/types';
import { colors, numbers, type } from '../../../theme';
export default function Content(){
 const router=useRouter(),navigation=useNavigation(),data=useData(),actions=useActions(),reduced=useReducedMotion();
 const [add,setAdd]=useState(false),[detailId,setDetailId]=useState<Id|null>(null),[postedOpen,setPostedOpen]=useState(false),[reorder,setReorder]=useState(false),[dragging,setDragging]=useState(false),[clearForReorder,setClearForReorder]=useState(false);
 const {content,pillars,contentFilter:filter}=data.state,filtered=content.filter(c=>filter==='all'||c.pillarId===filter),active=filtered.filter(c=>c.status!=='Posted'),posted=filtered.filter(c=>c.status==='Posted'),selected=pillars.find(p=>p.id===filter),detail=content.find(c=>c.id===detailId);
 useEffect(()=>{const parent=navigation.getParent();parent?.setOptions({tabBarStyle:reorder?{display:'none'}:undefined});return ()=>parent?.setOptions({tabBarStyle:undefined});},[navigation,reorder]);
 function select(id:Id|'all'){data.setState(s=>({...s,contentFilter:s.contentFilter===id?'all':id}));}
 function enterReorder(){if(filter!=='all'){setClearForReorder(true);return;}setReorder(true);}
 const card=(item:typeof content[number])=><IdeaCard item={item} pillar={pillars.find(p=>p.id===item.pillarId)} hidePillar={filter!=='all'} onPress={()=>setDetailId(item.id)} onDelete={()=>actions.deleteIdea(item.id)}/>;
 return <Page hideSettings={reorder} title={reorder?'Drag to reorder':'Content'} actions={reorder?<Button label="Done" tone="quiet" disabled={actions.busy||dragging} onPress={()=>setReorder(false)}/>:<>{content.length>0&&<IconButton name="grip" label="Reorder ideas" onPress={enterReorder}/>}<IconButton name="film" label="Content pillars" onPress={()=>router.push('/content/pillars')}/></>}>
 {reorder?<DraggableFlatList data={active} keyExtractor={c=>String(c.id)} contentContainerStyle={[ui.gutter,{paddingTop:12,paddingBottom:30}]} animationConfig={reduced?{reduceMotion:ReduceMotion.Always}:undefined} onDragBegin={()=>{setDragging(true);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);}} onPlaceholderIndexChange={()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} onDragEnd={({data:ordered,from,to})=>{setDragging(false);if(from!==to)void actions.reorderIdeas(mergePipelineOrder(content,ordered));}} renderPlaceholder={()=> <View style={{borderTopWidth:2,borderColor:colors.moss}}/>} renderItem={({item,drag,isActive})=><View style={{opacity:dragging&&!isActive?0.75:1,transform:[{rotate:isActive&&!reduced?'0.4deg':'0deg'}],shadowColor:colors.ink,shadowOpacity:isActive?0.18:0,shadowRadius:12,shadowOffset:{width:0,height:5}}}><View style={ui.line}><View style={ui.flex}><IdeaCard item={item} pillar={pillars.find(p=>p.id===item.pillarId)}/></View><Pressable accessibilityRole="button" accessibilityLabel={`Drag ${item.idea}`} disabled={actions.busy||dragging} onLongPress={drag} delayLongPress={150} style={{width:44,minHeight:80,alignItems:'center',justifyContent:'center'}}><Text style={[type.title,{color:colors.ink3}]}>⠿</Text></Pressable></View></View>}/>:<>
 {content.length>0&&<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,marginBottom:12}} contentContainerStyle={[ui.gutter,ui.line]}><Chip label={`All · ${content.length}`} selected={filter==='all'} onPress={()=>select('all')}/>{pillars.map(p=><Chip key={p.id} label={p.name} color={(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text} selected={filter===p.id} onPress={()=>select(p.id)}/>)}</ScrollView>}
 {clearForReorder&&<View style={[ui.gutter,{marginBottom:12}]}><Button label="Clear the filter to reorder" tone="quiet" onPress={()=>{select('all');setClearForReorder(false);setReorder(true);}}/></View>}
 {selected&&<View style={[ui.line,ui.gutter,{marginBottom:10}]}><Text style={[type.subtitle,numbers,ui.flex]}>{filtered.length} ideas in {selected.name}</Text><Button label="Clear" tone="quiet" onPress={()=>select('all')}/></View>}
 <FlatList data={filter==='all'?active:filtered} keyExtractor={c=>String(c.id)} contentContainerStyle={[ui.gutter,{paddingBottom:100}]} refreshControl={<RefreshControl refreshing={false} onRefresh={data.refetch} tintColor={colors.moss}/>} renderItem={({item})=>card(item)} ListEmptyComponent={filter==='all'&&posted.length>0?null:<><EmptyState title={content.length?'No ideas in this pillar':'No ideas yet'} copy="You can pick a pillar and a stage later." action={pillars.length?'Add an idea':'Create a pillar'} onPress={()=>pillars.length?setAdd(true):router.push('/content/pillars')}/><Button label={pillars.length?'Manage pillars':'Add an idea'} tone="quiet" onPress={()=>pillars.length?router.push('/content/pillars'):setAdd(true)}/></>} ListFooterComponent={filter==='all'&&posted.length>0?<><Button label={`${postedOpen?'⌃':'⌄'} Posted · ${posted.length}`} tone="quiet" onPress={()=>setPostedOpen(!postedOpen)}/>{postedOpen&&posted.map(item=><View key={item.id}>{card(item)}</View>)}</>:null}/>
 <Fab label="Add idea" onPress={()=>setAdd(true)}/></>}
 {add&&<AddIdeaSheet filter={filter} onClose={()=>setAdd(false)}/>} {detail&&<IdeaDetailSheet item={detail} onClose={()=>setDetailId(null)}/>}</Page>;
}
