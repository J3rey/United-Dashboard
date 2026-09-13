import { Alert } from '../../../lib/alert';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { usePrefs } from '../../../hooks/usePrefs';
import { Page } from '../../../components/TabShell';
import { LedgerRow } from '../../../components/LedgerRow';
import { Icon } from '../../../components/Icon';
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
  const periodExpenses = useMemo(() => data.state.expenses.filter((row): row is Expense => !row.isHeader && !row.isEnd && row.date.startsWith(period)), [data.state.expenses,period]);
  const out = useMemo(() => periodExpenses.reduce((sum,row) => sum + row.cost,0), [periodExpenses]), income = useMemo(() => data.state.income.filter(row => row.date.startsWith(period)).reduce((sum,row) => sum + row.amount,0), [data.state.income,period]);
  const filtered = useMemo(() => data.state.expenses.filter(row => row.date.startsWith(period) && (row.isHeader || row.isEnd || !categories.length || categories.includes(row.cat))), [data.state.expenses,period,categories]);
  const sections = useMemo(() => transactionSections(filtered), [filtered]);
  const expense = data.state.expenses.find((row): row is Expense => row.id === detailId && !row.isHeader && !row.isEnd);
  let event: string | undefined;
  for (const row of data.state.expenses) { if (row.id === detailId) break; if (row.isHeader) event = row.label; if (row.isEnd) event = undefined; }
  return <Page title="Finance" actions={<><IconButton name="chart" label="Insights" onPress={() => router.push({ pathname: '/finance/insights', params: { month, wholeYear: String(wholeYear) } })}/></>}>
    <SectionList sections={sections} keyExtractor={row => String(row.id)} stickySectionHeadersEnabled contentContainerStyle={[ui.gutter,{ paddingBottom:100 }]} refreshControl={<RefreshControl refreshing={false} onRefresh={data.refetch} tintColor={colors.moss}/>} ListHeaderComponent={<>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Choose period, ${wholeYear ? month.slice(0,4) : monthLabel(month)}`} onPress={() => setFilter(true)} style={({pressed}) => [styles.month,pressed && styles.pressed]}><Text numberOfLines={1} style={[type.body,numbers,{fontSize:15,flexShrink:1}]}>{wholeYear ? month.slice(0,4) : monthLabel(month)}</Text><View style={{transform:[{rotate:'90deg'}]}}><Icon name="chevron" size={16}/></View></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter spending" accessibilityState={{selected:categories.length>0||wholeYear}} onPress={() => setFilter(true)} style={({pressed}) => [styles.filters,(categories.length>0||wholeYear) && {backgroundColor:colors.mossLight},pressed && styles.pressed]}><Icon name="filter" size={17} color={categories.length>0||wholeYear?colors.moss:colors.ink2}/><Text style={[type.body,numbers,{fontSize:13,color:categories.length>0||wholeYear?colors.moss:colors.ink2}]}>Filters{categories.length?` · ${categories.length}`:''}</Text></Pressable>
      </View>
      <Stat label={wholeYear?"Net this year":"Net this month"} value={money(income-out,true)} color={income === out ? colors.ink3 : income > out ? colors.green : colors.red} wide action={<View style={ui.line}><Button label="Income →" tone="quiet" onPress={() => router.push('/finance/income')}/><Button label="Debts →" tone="quiet" onPress={() => router.push('/finance/debts')}/></View>}/><View style={[ui.line,{ marginBottom:16 }]}><Stat label="Out" value={money(out)} color={out ? colors.red : colors.ink3}/><Stat label="In" value={money(income)} color={income ? colors.ink : colors.ink3}/></View>
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
const styles = StyleSheet.create({ toolbar: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:2,marginBottom:16 }, month: { minHeight:44,minWidth:44,flexShrink:1,flexDirection:'row',alignItems:'center',gap:9,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.surface,paddingHorizontal:12 }, filters: { minHeight:44,minWidth:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:10,borderRadius:12 }, pressed: { backgroundColor:colors.surface2 }, day: { backgroundColor:colors.paper, paddingTop:13, paddingBottom:6, flexDirection:'row', justifyContent:'space-between' }, marker: { minHeight:44, flexDirection:'row', alignItems:'center', gap:9 }, rule: { flex:1,height:StyleSheet.hairlineWidth, opacity:0.5 } });
