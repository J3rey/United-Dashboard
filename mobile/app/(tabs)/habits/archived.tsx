import { Pressable, ScrollView, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { Page } from '../../../components/TabShell';
import { Button, ui } from '../../../components/ui';
import { confirmDeleteHabit } from '../../../components/sheets/HabitSheets';
import { colors, type } from '../../../theme';
export default function Archived() {const data=useData(),actions=useActions();return <Page title="Archived habits" back><ScrollView contentContainerStyle={[ui.gutter,{paddingTop:16,paddingBottom:24}]}><Text style={[type.subtitle,{lineHeight:19,marginBottom:14}]}>Archived habits keep their history and stop showing up in your week. Restore one any time.</Text><View style={ui.card}>{data.state.habits.filter(h=>h.archived).map(h=><ReanimatedSwipeable key={h.id} renderRightActions={()=> <Button label="Delete" tone="danger" disabled={actions.busy} onPress={()=>confirmDeleteHabit(h,()=>{void actions.deleteHabit(h.id);})}/>}><View style={[ui.line,{minHeight:56,paddingHorizontal:13,backgroundColor:colors.surface}]}><View style={ui.flex}><Text style={type.body}>{h.name}</Text><Text style={type.subtitle}>{h.daily?'every day':`${h.goal} a week`}</Text></View><Pressable accessibilityRole="button" disabled={actions.busy} style={{minWidth:60,minHeight:44,justifyContent:'center'}} onPress={()=>{void actions.editHabit(h.id,{archived:false});}}><Text style={[type.body,{color:colors.moss}]}>Restore</Text></Pressable></View></ReanimatedSwipeable>)}</View>{!data.state.habits.some(h=>h.archived)&&<Text style={type.subtitle}>No archived habits.</Text>}</ScrollView></Page>;}
