import { Alert } from '../../../lib/alert';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { usePrefs } from '../../../hooks/usePrefs';
import { Page } from '../../../components/TabShell';
import { LedgerRow } from '../../../components/LedgerRow';
import { Button, EmptyState, Fab, IconButton, Stat, ui } from '../../../components/ui';
import { AddExpenseSheet, ExpenseDetailSheet, FilterSheet } from '../../../components/sheets/ExpenseSheets';
import { EventSheet } from '../../../components/sheets/EventSheet';
import { transactionSections } from '../../../lib/finance';
import { dateLabel, dateString, money, monthLabel } from '../../../lib/format';
import type { Category } from '../../../lib/constants';
import type { Expense, EventHeader, EventEnd, Id } from '../../../lib/types';
import { colors, numbers, type } from '../../../theme';
export default function Finance() {
  const router = useRouter(), data = useData(), actions = useActions(), prefs = usePrefs();
  const [month, setMonth] = useState(dateString().slice(0,7)), [categories, setCategories] = useState<Category[]>([]), [wholeYear, setWholeYear] = useState(false);
  const [add, setAdd] = useState(false), [filter, setFilter] = useState(false), [detailId, setDetailId] = useState<Id | null>(null), [marker, setMarker] = useState<EventHeader | EventEnd | 'new' | null>(null);
  useEffect(() => { if (prefs.ready && prefs.openOn === 'last') setMonth(prefs.lastMonth); }, [prefs.ready]);
  const period = wholeYear ? month.slice(0,4) : month;
  const periodExpenses = data.state.expenses.filter((row): row is Expense => !row.isHeader && !row.isEnd && row.date.startsWith(period));
  const out = periodExpenses.reduce((sum,row) => sum + row.cost,0), income = data.state.income.filter(row => row.date.startsWith(period)).reduce((sum,row) => sum + row.amount,0);
  const filtered = data.state.expenses.filter(row => row.date.startsWith(period) && (row.isHeader || row.isEnd || !categories.length || categories.includes(row.cat)));
  const expense = data.state.expenses.find((row): row is Expense => row.id === detailId && !row.isHeader && !row.isEnd);
  let event: string | undefined;
  for (const row of data.state.expenses) { if (row.id === detailId) break; if (row.isHeader) event = row.label; if (row.isEnd) event = undefined; }
  return <Page title="Finance" actions={<><IconButton name="chart" label="Insights" onPress={() => router.push({ pathname: '/finance/insights', params: { month, wholeYear: String(wholeYear) } })}/><IconButton name="filter" label="Filter spending" onPress={() => setFilter(true)}/></>}>
    <SectionList sections={transactionSections(filtered)} keyExtractor={row => String(row.id)} stickySectionHeadersEnabled contentContainerStyle={[ui.gutter,{ paddingBottom:100 }]} refreshControl={<RefreshControl refreshing={false} onRefresh={data.refetch} tintColor={colors.moss}/>} ListHeaderComponent={<>
      <Pressable accessibilityRole="button" onPress={() => setFilter(true)} style={styles.month}><Text style={[type.body,numbers]}>{wholeYear ? month.slice(0,4) : monthLabel(month)}⌄</Text></Pressable>
      <Stat label={wholeYear?"Net this year":"Net this month"} value={money(income-out,true)} color={income === out ? colors.ink3 : income > out ? colors.green : colors.red} wide action={<Button label="Income →" tone="quiet" onPress={() => router.push('/finance/income')}/>}/><View style={[ui.line,{ marginBottom:16 }]}><Stat label="Out" value={money(out)} color={out ? colors.red : colors.ink3}/><Stat label="In" value={money(income)} color={income ? colors.ink : colors.ink3}/></View>
      {!periodExpenses.length && <EmptyState title={`Nothing spent in ${wholeYear ? month.slice(0,4) : monthLabel(month).split(' ')[0]}`} copy="Add the first expense and it’ll show up here, grouped by day." action="Add an expense" onPress={() => setAdd(true)}/>}
      {periodExpenses.length > 0 && !filtered.some(row => !row.isHeader && !row.isEnd) && <EmptyState title={`No ${categories.join(' or ')} spending in ${monthLabel(month).split(' ')[0]}`} copy="Clear the filters to see the rest of this month." action="Clear filters" onPress={() => setCategories([])}/>}
    </>} renderSectionHeader={({ section }) => section.marker ? <Pressable accessibilityRole="button" onPress={() => setMarker(section.marker ?? null)} style={styles.marker}><Text style={[type.label,{ color: section.marker.isHeader ? colors.purple : colors.ink3 }]}>{section.marker.label}</Text><View style={[styles.rule,{ backgroundColor: section.marker.isHeader ? colors.purple : colors.border2 }]}/></Pressable> : <View style={styles.day}><Text style={[type.label,numbers]}>{dateLabel(section.date,false)}</Text><Text style={[type.label,numbers]}>{money(section.total)}</Text></View>} renderItem={({ item,index,section }) => <LedgerRow expense={item} first={index === 0} last={index === section.data.length-1} onPress={() => setDetailId(item.id)} onDelete={() => actions.deleteExpense(item.id)}/>}/>
    <Fab label="Add expense" onPress={() => setAdd(true)}/>
    {marker && <EventSheet marker={marker === 'new' ? undefined : marker} onClose={() => setMarker(null)}/>}
    {add && <AddExpenseSheet onClose={() => setAdd(false)} onEvent={() => setMarker('new')}/>}
    {expense && <ExpenseDetailSheet expense={expense} event={event} onClose={() => setDetailId(null)}/>}
    {filter && <FilterSheet month={month} categories={categories} wholeYear={wholeYear} onClose={() => setFilter(false)} onApply={(value,cats,year) => { setMonth(value); setCategories(cats); setWholeYear(year); void prefs.saveMonth(value).catch(() => Alert.alert('Couldn’t remember this month', 'The filter is applied. Reopening may show the current month.'));  }}/ >}
  </Page>;
}
const styles = StyleSheet.create({ month: { minHeight:44, alignSelf:'flex-start', justifyContent:'center', borderWidth:1, borderColor:colors.border, borderRadius:11, backgroundColor:colors.surface, paddingHorizontal:12, marginBottom:14 }, day: { backgroundColor:colors.paper, paddingTop:13, paddingBottom:6, flexDirection:'row', justifyContent:'space-between' }, marker: { minHeight:44, flexDirection:'row', alignItems:'center', gap:9 }, rule: { flex:1,height:StyleSheet.hairlineWidth, opacity:0.5 } });
