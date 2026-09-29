import { Alert } from '../../../lib/alert';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Page } from '../../../components/TabShell';
import { Button, Chip, EditRow, IconButton, Segmented, ui } from '../../../components/ui';
import { Icon } from '../../../components/Icon';
import { PillarPickerSheet, PostDateSheet, StageSheet } from '../../../components/sheets/ContentSheets';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { refHost, refHref, stageColors, stages } from '../../../lib/content';
import { dateLabel } from '../../../lib/format';
import type { ContentChanges, ContentItem } from '../../../lib/types';
import { colors, fonts, numbers, type } from '../../../theme';
type Draft = Pick<ContentItem,'idea'|'notes'|'refUrl'|'twist'|'origScript'|'script'>;
const draftOf=(c:ContentItem):Draft=>({idea:c.idea,notes:c.notes,refUrl:c.refUrl,twist:c.twist,origScript:c.origScript,script:c.script});
function Input({label,...props}:TextInputProps&{label:string}) {return <View style={ui.field}><Text style={ui.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.ink3} selectionColor={colors.moss} style={[ui.input,props.multiline&&{textAlignVertical:'top'},props.style]}/></View>;}
export default function IdeaPage(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),navigation=useNavigation(),data=useData(),actions=useActions();
 const item=data.state.content.find(c=>String(c.id)===id);
 const [draft,setDraft]=useState<Draft|null>(item?draftOf(item):null),[showRef,setShowRef]=useState(Boolean(item&&(item.refUrl||item.twist||item.origScript))),[version,setVersion]=useState<'orig'|'mine'>('mine'),[sheet,setSheet]=useState<'stage'|'pillar'|'date'|null>(null);
 const draftRef=useRef(draft),itemRef=useRef(item);draftRef.current=draft;itemRef.current=item;
 function commit(){const c=itemRef.current,d=draftRef.current;if(!c||!d)return;const changes:ContentChanges={};(Object.keys(d) as (keyof Draft)[]).forEach(k=>{const v=k==='idea'?d.idea.trim():d[k];if(k==='idea'&&!v)return;if(v!==c[k])changes[k]=v;});if(Object.keys(changes).length)void actions.editIdea(c.id,changes);}
 useEffect(()=>navigation.addListener('beforeRemove',commit),[navigation]);
 useEffect(()=>{if(!item)router.back();},[item,router]);
 if(!item||!draft)return null;
 const field=(k:keyof Draft)=>({value:draft[k],onChangeText:(v:string)=>setDraft(d=>d&&{...d,[k]:v}),onBlur:()=>{if(k==='idea'&&!draft.idea.trim())setDraft(d=>d&&{...d,idea:item.idea});commit();}});
 const index=stages.indexOf(item.status),next=stages[index+1],stage=stageColors[item.status],pillar=data.state.pillars.find(p=>p.id===item.pillarId),href=refHref(draft.refUrl);
 const remove=()=>Alert.alert('Delete idea?','You can undo this for four seconds.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>actions.deleteIdea(item.id)}]);
 return <Page title="Idea" back actions={<IconButton name="trash" label="Delete idea" onPress={remove}/>}>
 <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={[ui.gutter,{paddingBottom:40}]}>
  <TextInput accessibilityLabel="The idea" multiline {...field('idea')} selectionColor={colors.moss} style={{fontFamily:fonts.semibold,fontSize:22,letterSpacing:-0.4,color:colors.ink,paddingVertical:4,marginBottom:8}}/>
  <View style={[ui.line,{gap:4,marginBottom:10}]}>{stages.map((s,i)=><View key={s} style={{height:5,flex:1,borderRadius:3,backgroundColor:i<=index?stage.text:colors.border}}/>)}</View>
  <View style={[ui.line,{marginBottom:16}]}><Chip label={`${item.status} ⌄`} selected color={stage.text} onPress={()=>setSheet('stage')}/></View>
  <View style={[ui.card,{paddingHorizontal:14}]}><EditRow label="Pillar" value={pillar?.name??'No pillar'} onPress={()=>setSheet('pillar')}/><EditRow label="Post date" value={item.postDate?dateLabel(item.postDate,false):'None'} onPress={()=>setSheet('date')}/></View>
  <Input label="Notes" multiline placeholder="Anything to remember…" style={{minHeight:72}} {...field('notes')}/>
  {showRef?<>
   <Text style={[type.body,{fontFamily:fonts.semibold,fontSize:15,marginTop:10,marginBottom:10}]}>Reference reel</Text>
   <Input label="Link" autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="Paste Instagram / TikTok link" {...field('refUrl')}/>
   {Boolean(href)&&<View style={[ui.line,{marginTop:-6,marginBottom:12}]}><Text style={[type.subtitle,ui.flex]}>{refHost(draft.refUrl)}</Text><Pressable accessibilityRole="link" accessibilityLabel="Open reference reel" onPress={()=>{void Linking.openURL(href);}} style={({pressed})=>[ui.line,{minHeight:44,paddingHorizontal:14,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:5},pressed&&ui.dim]}><Text style={{fontFamily:fonts.semibold,fontSize:13,color:colors.moss}}>Open</Text><Icon name="external" size={15} color={colors.moss}/></Pressable></View>}
   <Input label="The twist · how mine differs" multiline placeholder="What am I changing? Audience, stakes, metaphor, ending…" style={{minHeight:80}} {...field('twist')}/>
  </>:<Pressable accessibilityRole="button" onPress={()=>setShowRef(true)} style={({pressed})=>[{minHeight:56,borderWidth:1.5,borderStyle:'dashed',borderColor:colors.border2,borderRadius:13,alignItems:'center',justifyContent:'center',paddingVertical:10,marginVertical:8},pressed&&ui.dim]}><Text style={{fontFamily:fonts.semibold,fontSize:14,color:colors.moss}}>+ Add a reference reel</Text><Text style={type.subtitle}>Unlocks original vs my draft</Text></Pressable>}
  <Text style={[type.body,{fontFamily:fonts.semibold,fontSize:15,marginTop:14,marginBottom:10}]}>Script</Text>
  {showRef&&<Segmented value={version} onChange={setVersion} options={[['orig','Original'],['mine','My draft']]}/>}
  {showRef&&version==='orig'?<Input key="orig" label="Original (their transcript)" multiline placeholder="Paste what they say…" style={{minHeight:260,lineHeight:22}} {...field('origScript')}/>:<Input key="mine" label={showRef?'My draft':'Script'} multiline placeholder="Hook, beats, close…" style={{minHeight:260,lineHeight:22}} {...field('script')}/>}
  {next&&<Button label={`Mark as ${next.toLowerCase()}`} disabled={actions.busy} onPress={()=>{commit();void actions.editIdea(item.id,{status:next});}}/>}
 </ScrollView>
 {sheet==='stage'&&<StageSheet value={item.status} onClose={()=>setSheet(null)} onSelect={async status=>{if(await actions.editIdea(item.id,{status}))setSheet(null);}}/>}
 {sheet==='pillar'&&<PillarPickerSheet value={item.pillarId} onClose={()=>setSheet(null)} onSelect={async pillarId=>{if(await actions.editIdea(item.id,{pillarId}))setSheet(null);}}/>}
 {sheet==='date'&&<PostDateSheet value={item.postDate} title={item.idea} onClose={()=>setSheet(null)} onSet={async postDate=>{if(await actions.editIdea(item.id,{postDate}))setSheet(null);}}/>}
 </Page>;
}
