import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useActions } from '../hooks/useActions';
import { PILLAR_COLORS } from '../lib/constants';
import { stageColors } from '../lib/content';
import type { ContentItem, Pillar } from '../lib/types';
import { colors, fonts, numbers, type } from '../theme';
import { Button, ui } from './ui';
export function IdeaCard({item,pillar,hidePillar,onPress,onDelete}:{item:ContentItem;pillar?:Pillar;hidePillar?:boolean;onPress?:()=>void;onDelete?:()=>void}) {
 const actions=useActions();
 const color=PILLAR_COLORS[pillar?.colorIdx??0]??PILLAR_COLORS[0]!,stage=stageColors[item.status];
 const card=<Pressable accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} onPress={onPress} onLongPress={onPress} style={({pressed})=>[styles.card,{borderLeftColor:pillar?color.text:colors.border2},pressed&&{backgroundColor:colors.surface2}]}><Text style={styles.title}>{item.idea}</Text><View style={ui.wrap}>{!hidePillar&&<View style={[styles.badge,{backgroundColor:pillar?color.bg:colors.surface2}]}><Text style={[styles.badgeText,{color:pillar?color.text:colors.ink3}]} numberOfLines={1}>{pillar?.name??'No pillar'}</Text></View>}<View style={[styles.badge,{backgroundColor:stage.bg}]}><Text style={[styles.badgeText,{color:stage.text}]}>{item.status}</Text></View></View>{Boolean(item.notes)&&<Text numberOfLines={2} style={[type.subtitle,{fontStyle:'italic',lineHeight:18}]}>{item.notes}</Text>}</Pressable>;
 return <View style={{marginBottom:9}}>{onDelete?<ReanimatedSwipeable overshootRight={false} renderRightActions={()=> <Button label="Delete" tone="danger" disabled={actions.busy} onPress={onDelete}/>}>{card}</ReanimatedSwipeable>:card}</View>;
}
export const ideaStyles=StyleSheet.create({card:{backgroundColor:colors.surface,borderRadius:14,borderWidth:1,borderColor:colors.border,borderLeftWidth:3,paddingHorizontal:14,paddingVertical:13,gap:9,minHeight:80},title:{fontFamily:fonts.semibold,fontSize:15,color:colors.ink},badge:{borderRadius:999,paddingHorizontal:9,paddingVertical:4,maxWidth:220},badgeText:{fontFamily:fonts.medium,fontSize:11.5,...numbers}});
const styles=ideaStyles;
