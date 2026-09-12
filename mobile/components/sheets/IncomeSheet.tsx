import { Alert } from '../../lib/alert';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { dateString } from '../../lib/format';
import type { Income, IncomeChanges } from '../../lib/types';
import { colors, numbers, type } from '../../theme';
import { Button, Chip, DateField, Field, Sheet, ui } from '../ui';
export function IncomeSheet({income,onClose}:{income?:Income;onClose:()=>void}) {
 const data=useData(),actions=useActions(),[amount,setAmount]=useState(income?String(income.amount):''),[source,setSource]=useState(income?.source??''),[date,setDate]=useState(income?.date??dateString()),[salary,setSalary]=useState(income?.salary??false);
 const dirty=Boolean(income&&(amount!==String(income.amount)||source!==income.source||date!==income.date||salary!==income.salary));
 const sources=[...new Set([...data.state.income].reverse().map(i=>i.source).filter(Boolean))];
 async function save(){const value=Math.round(Number(amount)*100)/100;if(!Number.isFinite(value)||value<=0||!source.trim())return;let ok=false;if(income){const changes:IncomeChanges={};if(value!==income.amount)changes.amount=value;if(source.trim()!==income.source)changes.source=source.trim();if(date!==income.date)changes.date=date;if(salary!==income.salary)changes.salary=salary;ok=Object.keys(changes).length?await actions.editIncome(income.id,changes):true;}else ok=await actions.saveIncome({date,source:source.trim(),amount:value,salary});if(ok)onClose();}
 return <Sheet title={income?income.source:'New income'} onClose={onClose} confirmClose={income?close=>{if(dirty)Alert.alert('Discard changes?','Your unsaved edits will be lost.',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:close}]);else close();}:undefined}><Field label="Amount" autoFocus keyboardType="decimal-pad" placeholder="0.00" value={amount} onChangeText={setAmount} style={[numbers,{fontSize:29,color:colors.green,textAlign:'right'}]}/><Field label="Where from" value={source} onChangeText={setSource}/>{sources.length>=3&&<View style={[ui.wrap,{marginBottom:12}]}>{sources.slice(0,5).map(s=><Chip key={s} label={s} onPress={()=>setSource(s)}/>)}</View>}<DateField value={date} onChange={setDate}/><View style={[ui.line,{minHeight:52,marginBottom:14}]}><Text style={[type.body,ui.flex]}>This is salary</Text><View style={{minWidth:51,minHeight:44,justifyContent:'center'}}><Switch accessibilityLabel="This is salary" value={salary} onValueChange={setSalary} trackColor={{false:colors.border2,true:colors.moss}} thumbColor={colors.surface}/></View></View><Button label={income?'Save changes':'Add income'} disabled={actions.busy||!source.trim()||!Number.isFinite(Number(amount))||Number(amount)<=0} onPress={()=>{void save();}}/>{income&&<Button label="Delete" tone="danger" disabled={actions.busy} onPress={()=>Alert.alert('Delete income?','You can undo this for four seconds.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{actions.deleteIncome(income.id);onClose();}}])}/>}</Sheet>;
}
