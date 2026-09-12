import { Alert } from '../../lib/alert';
import { useState } from 'react';
import { Text } from 'react-native';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { dateString } from '../../lib/format';
import type { EventEnd, EventHeader } from '../../lib/types';
import { Button, DateField, Field, Sheet } from '../ui';
import { type } from '../../theme';
export function EventSheet({marker,onClose}:{marker?:EventHeader|EventEnd;onClose:()=>void}) {
 const data=useData(),actions=useActions(),[label,setLabel]=useState(marker?.label??''),[date,setDate]=useState(marker?.date??dateString()),[endDate,setEndDate]=useState(dateString());
 const headers=data.state.expenses.filter((row):row is EventHeader=>Boolean(row.isHeader)),unclosed=headers.filter(header=>!data.state.expenses.some(row=>row.isEnd&&row.headerId===header.id)),open=unclosed.at(-1),canEnd=Boolean(open&&(!marker||marker.id===open.id));
 async function save(){if(!label.trim()||actions.busy)return;if(marker){const changes={...(date!==marker.date?{date}:{}),...(label.trim()!==marker.label?{label:label.trim()}: {})};if(!Object.keys(changes).length||await actions.editExpense(marker.id,changes))onClose();}else if(await actions.saveMarker({id:`event-${Date.now()}`,isHeader:true,date,label:label.trim()}))onClose();}
 return <Sheet title="Event marker" subtitle="Group expenses between a start and an end, without changing them." onClose={onClose}><Field label="Event name" autoFocus value={label} onChangeText={setLabel}/><DateField label={marker?.isEnd?'End date':'Start date'} value={date} onChange={setDate}/><Button label={marker?'Save changes':'Start event'} disabled={!label.trim()||actions.busy||(!marker&&Boolean(open))} onPress={()=>{void save();}}/>{!marker&&open&&<Text style={type.subtitle}>End {open.label} before starting another event.</Text>}{canEnd&&open&&<><DateField label="End date" value={endDate} onChange={setEndDate}/><Button label={`End ${open.label}`} tone="quiet" disabled={actions.busy||endDate<open.date} onPress={async()=>{if(await actions.saveMarker({id:`event-end-${Date.now()}`,isEnd:true,date:endDate,label:open.label,headerId:open.id}))onClose();}}/></>}{marker&&<Button label="Delete marker" tone="danger" disabled={actions.busy} onPress={()=>Alert.alert('Delete marker?',marker.isHeader?'The matching end marker will be removed too. Expenses stay unchanged.':'Expenses stay unchanged.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{actions.deleteExpense(marker.id);onClose();}}])}/>}</Sheet>;
}
