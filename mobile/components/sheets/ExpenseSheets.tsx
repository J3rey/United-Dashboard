import { Alert } from '../../lib/alert';
import { useState } from 'react';
import { LayoutAnimation, Text, View } from 'react-native';
import { Button, Categories, Chip, DateField, EditRow, Field, Sheet, ui } from '../ui';
import { colors, numbers, type } from '../../theme';
import { useData } from '../../hooks/useAppData';
import { useActions } from '../../hooks/useActions';
import { usePrefs } from '../../hooks/usePrefs';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { dateLabel, dateString, money, monthLabel } from '../../lib/format';
import type { Category } from '../../lib/constants';
import type { Expense, TransactionType } from '../../lib/types';
export function AddExpenseSheet({ onClose, onEvent }: { onClose: () => void; onEvent: () => void }) {
  const actions = useActions(), prefs = usePrefs(), reduced = useReducedMotion();
  const [amount, setAmount] = useState(''), [cat, setCat] = useState(prefs.category), [detail, setDetail] = useState(''), [date, setDate] = useState(dateString()), [split, setSplit] = useState<TransactionType>('normal'), [person, setPerson] = useState('');
  async function save() {
    const cost = Number(amount); if (!Number.isFinite(cost) || cost <= 0) return;
    const ok = await actions.saveExpense({ date, cat, detail: detail.trim(), cost: Math.round(cost * 100) / 100, type: split, person: split === 'normal' ? '' : person.trim() });
    if (ok) { try { await prefs.saveCategory(cat); } catch { Alert.alert('Expense saved', 'Couldn’t remember your category.'); } onClose(); }
  }
  return <Sheet title="New expense" onClose={onClose}>
    <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus placeholder="0.00" style={[numbers, { fontSize: 29, textAlign: 'right' }]}/>
    <Text style={ui.label}>Category</Text><Categories selected={[cat]} onPress={setCat}/>
    <Field label="What was it" value={detail} onChangeText={setDetail}/><DateField value={date} onChange={setDate}/>
    <Text style={ui.label}>Split</Text><View style={ui.wrap}>{([['normal','Just me'],['paid','Someone paid'],['for','I paid for']] as const).map(([value,label]) => <Chip key={value} label={label} selected={split === value} onPress={() => { if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSplit(value); if (value === 'normal') setPerson(''); }}/>)}</View>
    {split !== 'normal' && <Field label={split === 'paid' ? 'Who paid' : 'Who it was for'} value={person} onChangeText={setPerson}/>}
    <Button label="Add expense" onPress={() => { void save(); }} disabled={actions.busy || !Number.isFinite(Number(amount)) || Number(amount) <= 0}/>
    <Button label="Start an event" tone="quiet" onPress={() => { onClose(); onEvent(); }}/>
  </Sheet>;
}
export function ExpenseDetailSheet({ expense, event, onClose }: { expense: Expense; event?: string; onClose: () => void }) {
  const actions = useActions();
  const [editing, setEditing] = useState<'amount' | 'category' | 'split' | 'detail' | 'date' | null>(null);
  const [amount, setAmount] = useState(String(expense.cost)), [detail, setDetail] = useState(expense.detail), [person, setPerson] = useState(expense.person), [split, setSplit] = useState(expense.type);
  const update = async (changes: Parameters<typeof actions.editExpense>[1]) => { if (await actions.editExpense(expense.id, changes)) setEditing(null); };
  return <Sheet title={expense.detail || 'Expense'} subtitle={`${expense.cat} · ${dateLabel(expense.date, false)}${event ? ` · during ${event}` : ''}`} onClose={onClose}>
    {editing === 'amount' ? <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus style={numbers} onBlur={() => { const cost = Number(amount); if (Number.isFinite(cost) && cost > 0 && cost !== expense.cost) void update({ cost: Math.round(cost * 100) / 100 }); }}/>: <EditRow label="Amount" value={money(expense.cost)} onPress={() => setEditing('amount')}/>}
    {editing === 'detail' ? <Field label="What was it" value={detail} onChangeText={setDetail} autoFocus onBlur={() => { if (detail.trim() !== expense.detail) void update({ detail: detail.trim() }); }}/>: <EditRow label="What was it" value={expense.detail} onPress={() => setEditing('detail')}/>}
    {editing === 'category' ? <Categories selected={[expense.cat]} onPress={cat => { void update({ cat }); }}/> : <EditRow label="Category" value={expense.cat} onPress={() => setEditing('category')}/>}
    {editing === 'date' ? <DateField value={expense.date} onChange={date => { void update({ date }); }}/> : <EditRow label="Date" value={dateLabel(expense.date)} onPress={() => setEditing('date')}/>}
    {editing === 'split' ? <><View style={ui.wrap}>{([['normal','Just me'],['paid','Someone paid'],['for','I paid for']] as const).map(([value,label]) => <Chip key={value} label={label} selected={split === value} onPress={() => { setSplit(value); if (value === 'normal') { setPerson(''); void actions.editExpense(expense.id, { type: value, person: '' }); } else void actions.editExpense(expense.id, { type: value }); }}/>)}</View>{split !== 'normal' && <Field label={split === 'paid' ? 'Who paid' : 'Who it was for'} value={person} onChangeText={setPerson} onBlur={() => { void update({ person: person.trim() }); }}/>}</> : <EditRow label="Split" value={expense.type === 'normal' ? 'Just me' : `${expense.person} ${expense.type === 'paid' ? 'paid' : 'paid for'}`} onPress={() => setEditing('split')}/>}
    <Button label="Done" onPress={onClose}/><Button label="Delete" tone="danger" disabled={actions.busy} onPress={() => Alert.alert('Delete expense?', 'You can undo this for four seconds.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { actions.deleteExpense(expense.id); onClose(); } }])}/>
  </Sheet>;
}
export function FilterSheet({ month, categories, wholeYear, onApply, onClose }: { month: string; categories: Category[]; wholeYear: boolean; onApply: (month: string, cats: Category[], wholeYear: boolean) => void; onClose: () => void }) {
  const [draftMonth, setMonth] = useState(month), [cats, setCats] = useState(categories), [year, setYear] = useState(wholeYear);
  const { state } = useData();
  const count = state.expenses.filter(row => !row.isHeader && !row.isEnd && row.date.startsWith(year ? draftMonth.slice(0,4) : draftMonth) && (!cats.length || cats.includes(row.cat))).length;
  const move = (direction: number) => { const date = new Date(draftMonth + '-01T12:00:00'); date.setMonth(date.getMonth() + direction); setMonth(dateString(date).slice(0,7)); };
  return <Sheet title="Filter" onClose={onClose}><Button label="Reset" tone="quiet" onPress={() => { setMonth(dateString().slice(0,7)); setCats([]); setYear(false); }}/><Text style={ui.label}>Month</Text><View style={ui.line}><Button label="‹" tone="quiet" onPress={() => move(-1)}/><Text style={[type.body,numbers,ui.flex,{ textAlign:'center' }]}>{monthLabel(draftMonth)}</Text><Button label="›" tone="quiet" onPress={() => move(1)}/></View><View style={ui.line}><Chip label="This month" selected={!year && draftMonth === dateString().slice(0,7)} onPress={() => { setMonth(dateString().slice(0,7)); setYear(false); }}/><Chip label="Whole year" selected={year} onPress={() => setYear(true)}/></View><Text style={[ui.label,{ marginTop: 16 }]}>Categories</Text><Categories selected={cats} onPress={cat => setCats(cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats,cat])}/><Button label={`Show ${count} expense${count === 1 ? '' : 's'}`} onPress={() => { onApply(draftMonth,cats,year); onClose(); }}/></Sheet>;
}

