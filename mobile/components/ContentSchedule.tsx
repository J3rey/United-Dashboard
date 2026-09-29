import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../hooks/useAppData';
import { PILLAR_COLORS } from '../lib/constants';
import { itemsOn, monthGrid, stageColors, unscheduled } from '../lib/content';
import { dateLabel, dateString } from '../lib/format';
import type { ContentItem, Id } from '../lib/types';
import { colors, fonts, numbers, type } from '../theme';
import { Icon } from './Icon';
import { ideaStyles } from './IdeaCard';
import { IconButton, ui } from './ui';
import { AddIdeaSheet, AddToDaySheet } from './sheets/ContentSheets';
const DOW=['S','M','T','W','T','F','S'];
export function ContentSchedule({items,onOpen}:{items:ContentItem[];onOpen:(id:Id)=>void}) {
 const data=useData(),today=dateString(),[selected,setSelected]=useState(today),[ym,setYm]=useState({year:Number(today.slice(0,4)),month:Number(today.slice(5,7))-1}),[openUnscheduled,setOpenUnscheduled]=useState(false),[sheet,setSheet]=useState<'add'|'new'|null>(null);
 const colorOf=(c:ContentItem)=>{const p=data.state.pillars.find(x=>x.id===c.pillarId);return p?(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text:colors.border2;};
 const grid=useMemo(()=>monthGrid(ym.year,ym.month),[ym]),dayItems=itemsOn(items,selected),loose=unscheduled(items);
 const shift=(delta:number)=>setYm(({year,month})=>{const d=new Date(year,month+delta,1);return {year:d.getFullYear(),month:d.getMonth()};});
 const select=(iso:string)=>{setSelected(iso);setYm({year:Number(iso.slice(0,4)),month:Number(iso.slice(5,7))-1});};
 const row=(c:ContentItem)=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Open ${c.idea}`} onPress={()=>onOpen(c.id)} style={({pressed})=>[ui.editRow,{paddingHorizontal:14,backgroundColor:pressed?colors.surface2:colors.surface}]}><View style={{width:8,height:8,borderRadius:4,backgroundColor:colorOf(c)}}/><Text style={[type.body,ui.flex]} numberOfLines={1}>{c.idea}</Text><View style={[ideaStyles.badge,{backgroundColor:stageColors[c.status].bg}]}><Text style={[ideaStyles.badgeText,{color:stageColors[c.status].text}]}>{c.status}</Text></View><Icon name="chevron" size={16} color={colors.ink3}/></Pressable>;
 const monthName=new Date(ym.year,ym.month,1).toLocaleDateString('en-AU',{month:'long'});
 return <View style={ui.gutter}>
  <View style={[ui.line,{gap:2}]}><Text style={[ui.flex,{fontFamily:fonts.bold,fontSize:20,letterSpacing:-0.5,color:colors.ink}]}>{monthName} <Text style={{fontFamily:fonts.regular,color:colors.ink3}}>{ym.year}</Text></Text><IconButton name="back" label="Previous month" onPress={()=>shift(-1)}/><IconButton name="chevron" label="Next month" onPress={()=>shift(1)}/><Pressable accessibilityRole="button" onPress={()=>select(today)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:10}}><Text style={{fontFamily:fonts.semibold,fontSize:13.5,color:colors.moss}}>Today</Text></Pressable></View>
  <View style={{flexDirection:'row',paddingVertical:4}}>{DOW.map((d,i)=><Text key={i} style={[type.label,{flex:1,textAlign:'center'}]}>{d}</Text>)}</View>
  <View style={{flexDirection:'row',flexWrap:'wrap'}}>{grid.map(iso=>{const out=Number(iso.slice(5,7))-1!==ym.month,on=itemsOn(items,iso),isSel=iso===selected,isToday=iso===today;return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={`${dateLabel(iso,false)}, ${on.length} ${on.length===1?'idea':'ideas'}`} accessibilityState={{selected:isSel}} onPress={()=>select(iso)} style={{width:`${100/7}%`,height:50,alignItems:'center',paddingTop:4,gap:4}}><View style={{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:isSel?colors.moss:colors.transparent,borderWidth:isToday&&!isSel?1.5:0,borderColor:colors.moss}}><Text style={[numbers,{fontFamily:isSel||isToday?fonts.semibold:fonts.medium,fontSize:14,color:isSel?colors.surface:isToday?colors.moss:out?colors.border2:colors.ink}]}>{Number(iso.slice(8))}</Text></View><View style={[ui.line,{gap:3,height:6}]}>{on.slice(0,3).map(c=><View key={c.id} style={{width:6,height:6,borderRadius:3,...(c.status==='Posted'?{borderWidth:1.5,borderColor:colorOf(c)}:{backgroundColor:colorOf(c)})}}/>)}{on.length>3&&<Text style={[numbers,{fontFamily:fonts.semibold,fontSize:9,lineHeight:9,color:colors.ink2}]}>+{on.length-3}</Text>}</View></Pressable>;})}</View>
  <View style={[ui.line,{marginTop:14,marginBottom:10,alignItems:'baseline'}]}><Text style={{fontFamily:fonts.semibold,fontSize:15,color:colors.ink}}>{dateLabel(selected,false)}</Text><Text style={[type.subtitle,numbers]}>{dayItems.length} {dayItems.length===1?'idea':'ideas'}</Text></View>
  <View style={ui.card}>{dayItems.map(row)}<Pressable accessibilityRole="button" onPress={()=>setSheet('add')} style={({pressed})=>[ui.editRow,{paddingHorizontal:14,borderBottomWidth:0,backgroundColor:pressed?colors.surface2:colors.surface}]}><Icon name="plus" size={18} color={colors.moss}/><Text style={{fontFamily:fonts.semibold,fontSize:14,color:colors.moss}}>Add to this day</Text></Pressable></View>
  <View style={ui.card}><Pressable accessibilityRole="button" accessibilityState={{expanded:openUnscheduled}} onPress={()=>setOpenUnscheduled(!openUnscheduled)} style={[ui.editRow,{paddingHorizontal:14,borderBottomWidth:openUnscheduled&&loose.length?undefined:0}]}><Text style={[type.body,ui.flex]}>Unscheduled</Text><Text style={[type.subtitle,numbers]}>{loose.length}</Text><View style={{transform:[{rotate:openUnscheduled?'180deg':'0deg'}]}}><Icon name="down" size={16} color={colors.ink3}/></View></Pressable>{openUnscheduled&&loose.map(row)}</View>
  {sheet==='add'&&<AddToDaySheet date={selected} items={loose} onClose={()=>setSheet(null)} onNew={()=>setSheet('new')}/>}
  {sheet==='new'&&<AddIdeaSheet filter={data.state.contentFilter} postDate={selected} onClose={()=>setSheet(null)}/>}
 </View>;
}
