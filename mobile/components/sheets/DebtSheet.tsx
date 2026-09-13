import { Alert } from '../../lib/alert';
import { useState } from 'react';
import { View } from 'react-native';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { dateLabel, dateString } from '../../lib/format';
import type { Debt, DebtChanges } from '../../lib/types';
import { colors, numbers } from '../../theme';
import { Button, Chip, DateField, Field, Sheet, ui } from '../ui';
export function DebtSheet({debt,onClose}:{debt?:Debt;onClose:()=>void}) {
 const data=useData(),actions=useActions(),[amount,setAmount]=useState(debt?String(debt.amount):''),[person,setPerson]=useState(debt?.person??''),[detail,setDetail]=useState(debt?.detail??''),[date,setDate]=useState(debt?.date??dateString());
 const dirty=Boolean(debt&&(amount!==String(debt.amount)||person!==debt.person||detail!==debt.detail||date!==debt.date));
 const people=[...new Set([...data.state.debts].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>d.person).filter(Boolean))];
 async function save(){const value=Math.round(Number(amount)*100)/100;if(!Number.isFinite(value)||value<=0||!person.trim())return false;if(debt){const changes:DebtChanges={};if(value!==debt.amount)changes.amount=value;if(person.trim()!==debt.person)changes.person=person.trim();if(detail.trim()!==debt.detail)changes.detail=detail.trim();if(date!==debt.date)changes.date=date;return Object.keys(changes).length?actions.editDebt(debt.id,changes):true;}return actions.saveDebt({date,person:person.trim(),detail:detail.trim(),amount:value,resolved:false,resolvedAt:null});}
 const close=async(done=onClose)=>{if(await save())done();};
 return <Sheet title={debt?debt.person:'New debt'} subtitle={debt?debt.resolved?`Resolved${debt.resolvedAt?` ${dateLabel(debt.resolvedAt)}`:''}`:`Added ${dateLabel(debt.date)}`:undefined} onClose={onClose} confirmClose={debt?done=>{if(dirty)void close(done);else done();}:undefined}><Field label="Amount" autoFocus keyboardType="decimal-pad" placeholder="0.00" value={amount} onChangeText={setAmount} style={[numbers,{fontSize:29,color:colors.green,textAlign:'right'}]}/><Field label="Who" value={person} onChangeText={setPerson}/>{people.length>=3&&<View style={[ui.wrap,{marginBottom:12}]}>{people.slice(0,5).map(p=><Chip key={p} label={p} onPress={()=>setPerson(p)}/>)}</View>}<Field label="What for" placeholder="Optional" value={detail} onChangeText={setDetail}/><DateField value={date} onChange={setDate}/><View style={debt?ui.line:undefined}>{debt&&<Button label="Delete" tone="danger" disabled={actions.busy} onPress={()=>Alert.alert('Delete debt?','You can undo this for four seconds.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{actions.deleteDebt(debt.id);onClose();}}])}/>}<View style={ui.flex}><Button label={debt?'Save changes':'Add debt'} disabled={actions.busy||!person.trim()||!Number.isFinite(Number(amount))||Math.round(Number(amount)*100)<=0} onPress={()=>{void close();}}/></View></View>{debt&&<Button label={debt.resolved?'Reopen':'Mark resolved'} tone="quiet" disabled={actions.busy} onPress={async()=>{if(await save()&&await actions.resolveDebt(debt.id,!debt.resolved))onClose();}}/>}</Sheet>;
}
