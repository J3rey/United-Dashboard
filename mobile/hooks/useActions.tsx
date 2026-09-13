import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuth } from './useAuth';
import { useData } from './useAppData';
import * as db from '../lib/db';
import * as native from '../lib/nativeDb';
import { dateString } from '../lib/format';
import { insertByDate, insertExpenseBeforeEnd, sortRowsByDate } from '../lib/finance';
import type { AppState, ContentChanges, ContentItem, Debt, DebtChanges, Expense, Habit, HabitChanges, Id, Income, IncomeChanges, Pillar, Transaction, TransactionChanges } from '../lib/types';
let nextLocalId = 1000;
const localId = () => `mobile-${Date.now()}-${nextLocalId++}`;
function restoreRows<T extends { id: Id }>(current: T[], original: T[], removed: Set<Id>) {
  const out = [...current];
  for (const row of original.filter(item => removed.has(item.id))) {
    if (out.some(item => item.id === row.id)) continue;
    const next = original.slice(original.indexOf(row) + 1).find(item => out.some(x => x.id === item.id));
    const index = next ? out.findIndex(item => item.id === next.id) : out.length;
    out.splice(index, 0, row);
  }
  return out;
}
function useActionState() {
  const auth = useAuth(), data = useData();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const owner = useRef(auth.user?.id); owner.current = auth.user?.id;
  const stateRef = useRef(data.state); stateRef.current = data.state;
  const [failure, setFailure] = useState<{ message: string; retry: () => void } | null>(null);
  type UndoJob = { id: string; message: string; restore: () => void; timer: ReturnType<typeof setTimeout> };
  const jobs = useRef<UndoJob[]>([]);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  useEffect(() => { setFailure(null); setUndoMessage(null); return () => { jobs.current.forEach(job => clearTimeout(job.timer)); jobs.current = []; }; }, [auth.user?.id]);

  async function commit(apply: (state: AppState) => AppState, rollback: (state: AppState) => AppState, write: (userId: string) => Promise<void>, message: string, retry: () => void) {
    if (busyRef.current) return false;
    const account = owner.current;
    const demo = data.isDemo;
    busyRef.current = true; setBusy(true); setFailure(null); data.setState(apply);
    try {
      if (!demo && account) await write(account);
      if (owner.current === account) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return true;
    } catch (error) {
      if (owner.current === account) { data.setState(rollback); setFailure({ message, retry }); }
      console.info(message, error);
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  }
  function delayedDelete(message: string, apply: (state: AppState) => AppState, restore: (state: AppState) => AppState, write: (account: string) => Promise<void>) {
    if (busyRef.current) return;
    setFailure(null);
    const account = owner.current, demo = data.isDemo, id = localId();
    data.setState(apply); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const job: UndoJob = { id, message, restore: () => data.setState(restore), timer: setTimeout(async () => {
      jobs.current = jobs.current.filter(item => item.id !== id);
      setUndoMessage(jobs.current.at(-1)?.message ?? null);
      if (owner.current !== account || demo || !account) return;
      try { await write(account); }
      catch (error) { if (owner.current === account) { data.setState(restore); setFailure({ message: 'Couldn’t save that deletion. Tap to retry.', retry: () => delayedDelete(message, apply, restore, write) }); } console.info('Deletion failed', error); }
    }, 4000) };
    jobs.current.push(job); setUndoMessage(message);
  }
  function undo() { const job = jobs.current.pop(); if (!job) return; clearTimeout(job.timer); job.restore(); setUndoMessage(jobs.current.at(-1)?.message ?? null); }

  async function saveExpense(values: Omit<Expense, 'id'>) {
    const entry: Expense = { ...values, id: localId() }, before = stateRef.current.expenses;
    const planned = insertExpenseBeforeEnd(before, entry);
    return commit(s => ({ ...s, expenses: insertExpenseBeforeEnd(s.expenses, entry) }), s => ({ ...s, expenses: s.expenses.filter(row => row.id !== entry.id) }), async account => {
      const id = await native.insertOrderedTransaction(account, entry, planned);
      if (owner.current === account) data.setState(s => ({ ...s, expenses: s.expenses.map(row => row.id === entry.id ? { ...row, id } : row) }));
    }, 'Couldn’t save that expense. Tap to retry.', () => { void saveExpense(values); });
  }
  async function editExpense(id: Id, changes: TransactionChanges) {
    const before = stateRef.current.expenses, original = before.find(row => row.id === id);
    if (!original) return false;
    const planned = sortRowsByDate(before.map(row => row.id === id ? { ...row, ...changes } : row));
    return commit(s => ({ ...s, expenses: planned }), s => ({ ...s, expenses: sortRowsByDate(s.expenses.map(row => row.id === id ? original : row)) }), async account => {
      await db.updateTransaction(id, changes);
      if (changes.date) await native.saveTransactionOrder(account, planned.filter(row => row.date === original.date || row.date === changes.date));
    }, 'Couldn’t save that expense. Tap to retry.', () => { void editExpense(id, changes); });
  }
  function deleteExpense(id: Id) {
    const before = stateRef.current.expenses, target = before.find(row => row.id === id), removed = new Set<Id>([id]);
    if (target?.isHeader) before.forEach(row => { if (row.isEnd && row.headerId === id) removed.add(row.id); });
    delayedDelete('Expense deleted', s => ({ ...s, expenses: s.expenses.filter(row => !removed.has(row.id)) }), s => ({ ...s, expenses: restoreRows(s.expenses, before, removed) }), async account => { if (removed.size > 1) await native.deleteTransactions(account, [...removed]); else await db.deleteTransaction(id); });
  }
  async function saveMarker(entry: Transaction) {
    const planned = insertByDate(stateRef.current.expenses, entry);
    return commit(s => ({ ...s, expenses: insertByDate(s.expenses, entry) }), s => ({ ...s, expenses: s.expenses.filter(row => row.id !== entry.id) }), async account => {
      const id = await native.insertOrderedTransaction(account, entry, planned);
      if (owner.current === account) data.setState(s => ({ ...s, expenses: s.expenses.map(row => row.id === entry.id ? { ...row, id } : row) }));
    }, 'Couldn’t save that marker. Tap to retry.', () => { void saveMarker(entry); });
  }
  async function saveIncome(values: Omit<Income, 'id'>) {
    const entry = { ...values, id: localId() };
    return commit(s => ({ ...s, income: [...s.income, entry].sort((a,b) => a.date.localeCompare(b.date)) }), s => ({ ...s, income: s.income.filter(row => row.id !== entry.id) }), async account => {
      const id = await db.insertIncome(account, entry);
      if (owner.current === account) data.setState(s => ({ ...s, income: s.income.map(row => row.id === entry.id ? { ...row, id } : row) }));
    }, 'Couldn’t save that income. Tap to retry.', () => { void saveIncome(values); });
  }
  async function editIncome(id: Id, changes: IncomeChanges) {
    const original = stateRef.current.income.find(row => row.id === id); if (!original) return false;
    return commit(s => ({ ...s, income: s.income.map(row => row.id === id ? { ...row, ...changes } : row) }), s => ({ ...s, income: s.income.map(row => row.id === id ? original : row) }), async () => { await db.updateIncome(id, changes); }, 'Couldn’t save that income. Tap to retry.', () => { void editIncome(id, changes); });
  }
  function deleteIncome(id: Id) { const before = stateRef.current.income; delayedDelete('Income deleted', s => ({ ...s, income: s.income.filter(row => row.id !== id) }), s => ({ ...s, income: restoreRows(s.income, before, new Set([id])) }), async () => { await db.deleteIncome(id); }); }
  async function saveDebt(values: Omit<Debt, 'id'>) {
    const entry = { ...values, id: localId() };
    return commit(s => ({ ...s, debts: [...s.debts, entry] }), s => ({ ...s, debts: s.debts.filter(row => row.id !== entry.id) }), async account => {
      const id = await db.insertDebt(account, entry);
      if (owner.current === account) data.setState(s => ({ ...s, debts: s.debts.map(row => row.id === entry.id ? { ...row, id } : row) }));
    }, "Couldn't save that debt. Tap to retry.", () => { void saveDebt(values); });
  }
  async function editDebt(id: Id, changes: DebtChanges) {
    const original = stateRef.current.debts.find(row => row.id === id); if (!original) return false;
    return commit(s => ({ ...s, debts: s.debts.map(row => row.id === id ? { ...row, ...changes } : row) }), s => ({ ...s, debts: s.debts.map(row => row.id === id ? original : row) }), async () => { await db.updateDebt(id, changes); }, "Couldn't save that debt. Tap to retry.", () => { void editDebt(id, changes); });
  }
  async function resolveDebt(id: Id, resolved: boolean) {
    const ok = await editDebt(id, { resolved, resolvedAt: resolved ? dateString() : null });
    if (ok) Haptics.selectionAsync();
    return ok;
  }
  function deleteDebt(id: Id) { const before = stateRef.current.debts; delayedDelete('Debt deleted', s => ({ ...s, debts: s.debts.filter(row => row.id !== id) }), s => ({ ...s, debts: restoreRows(s.debts, before, new Set([id])) }), async () => { await db.deleteDebt(id); }); }
  async function saveHabit(values: Omit<Habit, 'id'>) {
    const entry = { ...values, id: localId() }, order = stateRef.current.habits.length;
    return commit(s => ({ ...s, habits: [...s.habits, entry] }), s => ({ ...s, habits: s.habits.filter(row => row.id !== entry.id) }), async account => {
      const id = await db.insertHabit(account, entry, order);
      if (owner.current === account) data.setState(s => ({ ...s, habits: s.habits.map(row => row.id === entry.id ? { ...row, id } : row) }));
    }, 'Couldn’t save that habit. Tap to retry.', () => { void saveHabit(values); });
  }
  async function editHabit(id: Id, changes: HabitChanges) {
    const original = stateRef.current.habits.find(row => row.id === id); if (!original) return false;
    return commit(s => ({ ...s, habits: s.habits.map(row => row.id === id ? { ...row, ...changes } : row) }), s => ({ ...s, habits: s.habits.map(row => row.id === id ? original : row) }), async () => { await db.updateHabit(id, changes); }, 'Couldn’t save that habit. Tap to retry.', () => { void editHabit(id, changes); });
  }
  function archiveHabit(id: Id) { delayedDelete('Habit archived', s => ({ ...s, habits: s.habits.map(row => row.id === id ? { ...row, archived: true } : row) }), s => ({ ...s, habits: s.habits.map(row => row.id === id ? { ...row, archived: false } : row) }), async () => { await db.updateHabit(id, { archived: true }); }); }
  async function deleteHabit(id: Id) {
    const original = stateRef.current.habits.find(row => row.id === id), logs = stateRef.current.habitChecks; if (!original) return false;
    return commit(s => ({ ...s, habits: s.habits.filter(row => row.id !== id), habitChecks: Object.fromEntries(Object.entries(s.habitChecks).filter(([key]) => !key.startsWith(`${id}_`))) }), s => ({ ...s, habits: [...s.habits, original], habitChecks: { ...s.habitChecks, ...logs } }), async account => { await native.deleteHabit(account, id); }, 'Couldn’t delete that habit. Tap to retry.', () => { void deleteHabit(id); });
  }
  async function toggleHabit(id: Id, date: string) {
    const key = `${id}_${date}`, original = Boolean(stateRef.current.habitChecks[key]);
    return commit(s => ({ ...s, habitChecks: { ...s.habitChecks, [key]: !original } }), s => ({ ...s, habitChecks: { ...s.habitChecks, [key]: original } }), async account => { await db.toggleHabitLog(account, id, date, !original); }, 'Couldn’t save that check. Tap to retry.', () => { void toggleHabit(id, date); });
  }
  async function saveIdea(values: Omit<ContentItem, 'id'>) {
    const entry = { ...values, id: localId() }, before = stateRef.current.content;
    return commit(s => ({ ...s, content: [entry, ...s.content] }), s => ({ ...s, content: s.content.filter(row => row.id !== entry.id) }), async account => {
      const id = await db.insertContentItem(account, entry, -1);
      const after = [{ ...entry, id }, ...before];
      try { await native.updateContentPositions([], after); } catch (error) { await db.deleteContentItem(id); throw error; }
      if (owner.current === account) data.setState(s => ({ ...s, content: s.content.map(row => row.id === entry.id ? { ...row, id } : row) }));
    }, 'Couldn’t save that idea. Tap to retry.', () => { void saveIdea(values); });
  }
  async function editIdea(id: Id, changes: ContentChanges) {
    const original = stateRef.current.content.find(row => row.id === id); if (!original) return false;
    return commit(s => ({ ...s, content: s.content.map(row => row.id === id ? { ...row, ...changes } : row) }), s => ({ ...s, content: s.content.map(row => row.id === id ? original : row) }), async () => { await db.updateContentItem(id, changes); }, 'Couldn’t save that idea. Tap to retry.', () => { void editIdea(id, changes); });
  }
  function deleteIdea(id: Id) { const before = stateRef.current.content; delayedDelete('Idea deleted', s => ({ ...s, content: s.content.filter(row => row.id !== id) }), s => ({ ...s, content: restoreRows(s.content, before, new Set([id])) }), async () => { await db.deleteContentItem(id); }); }
  async function reorderIdeas(after: ContentItem[]) {
    const before = stateRef.current.content;
    return commit(s => ({ ...s, content: after }), s => ({ ...s, content: before }), async () => { await native.updateContentPositions(before, after); }, 'Couldn’t save that order. Tap to retry.', () => { void reorderIdeas(after); });
  }
  async function savePillar(values: Omit<Pillar, 'id'>, id?: Id) {
    const before = stateRef.current.pillars, entry = { ...values, id: id ?? localId() };
    return commit(s => ({ ...s, pillars: id === undefined ? [...s.pillars, entry] : s.pillars.map(row => row.id === id ? entry : row) }), s => ({ ...s, pillars: before }), async account => {
      if (id !== undefined) await native.updatePillar(id, values);
      else { const savedId = await db.insertPillar(account, entry, before.length); if (owner.current === account) data.setState(s => ({ ...s, pillars: s.pillars.map(row => row.id === entry.id ? { ...row, id: savedId } : row) })); }
    }, 'Couldn’t save that pillar. Tap to retry.', () => { void savePillar(values, id); });
  }
  async function deletePillar(id: Id) {
    const before = stateRef.current.pillars;
    return commit(s => ({ ...s, pillars: s.pillars.filter(row => row.id !== id), contentFilter: s.contentFilter === id ? 'all' : s.contentFilter }), s => ({ ...s, pillars: before }), async () => { await db.deletePillar(id); }, 'Couldn’t delete that pillar. Tap to retry.', () => { void deletePillar(id); });
  }
  return { busy, failure, clearFailure: () => setFailure(null), undoMessage, undo, saveExpense, editExpense, deleteExpense, saveMarker, saveIncome, editIncome, deleteIncome, saveDebt, editDebt, resolveDebt, deleteDebt, saveHabit, editHabit, archiveHabit, deleteHabit, toggleHabit, saveIdea, editIdea, deleteIdea, reorderIdeas, savePillar, deletePillar };
}
const Context = createContext<ReturnType<typeof useActionState> | null>(null);
export function ActionsProvider({ children }: { children: ReactNode }) { const actions = useActionState(); return <Context.Provider value={actions}>{children}</Context.Provider>; }
export function useActions() { const actions = useContext(Context); if (!actions) throw new Error('useActions requires ActionsProvider'); return actions; }
