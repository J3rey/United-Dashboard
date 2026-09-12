import { supabase } from './supabase';
import * as db from './db';
import type { ContentItem, Id, Pillar, Transaction } from './types';

// Additional operations needed by native screens. Existing db.ts queries stay unchanged.
export async function saveTransactionOrder(userId: string, rows: Transaction[]) {
  const dates = new Map<string, Transaction[]>();
  for (const row of rows) dates.set(row.date, [...(dates.get(row.date) ?? []), row]);
  const results = await Promise.all([...dates.values()].flatMap(group => group.map((row, sort_order) =>
    supabase.from('finance_transactions').update({ sort_order }).eq('id', row.id).eq('user_id', userId)
  )));
  const failed = results.find(result => result.error); if (failed?.error) throw failed.error;
}
export async function insertOrderedTransaction(userId: string, entry: Transaction, rows: Transaction[]) {
  const id = await db.insertTransaction(userId, entry, rows.length);
  try {
    await saveTransactionOrder(userId, rows.filter(row => row.date === entry.date).map(row => row.id === entry.id ? { ...row, id } : row));
  } catch (error) {
    await db.deleteTransaction(id);
    throw error;
  }
  return id;
}
export async function deleteHabit(userId: string, id: Id) {
  const history = await supabase.from('habit_logs').select('*').eq('habit_id', id).eq('user_id', userId);
  if (history.error) throw history.error;
  const logs = await supabase.from('habit_logs').delete().eq('habit_id', id).eq('user_id', userId);
  if (logs.error) throw logs.error;
  const habit = await supabase.from('habits').delete().eq('id', id).eq('user_id', userId);
  if (habit.error) {
    if (history.data?.length) {
      const restored = await supabase.from('habit_logs').upsert(history.data, { onConflict: 'habit_id,week_start,day_index' });
      if (restored.error) throw new Error('Deletion failed and check history could not be restored. Reconnect and retry.');
    }
    throw habit.error;
  }
}
export async function updatePillar(id: Id, changes: Pick<Pillar, 'name' | 'colorIdx'>) {
  const { error } = await supabase.from('content_pillars').update({ name: changes.name, color_idx: changes.colorIdx }).eq('id', id);
  if (error) throw error;
}
export async function updateContentPositions(before: ContentItem[], after: ContentItem[]) {
  const changed = after.map((item, sort_order) => ({ item, sort_order })).filter(({ item, sort_order }) => before[sort_order]?.id !== item.id);
  const results = await Promise.all(changed.map(({ item, sort_order }) => supabase.from('content_items').update({ sort_order }).eq('id', item.id)));
  const failed = results.find(result => result.error); if (failed?.error) throw failed.error;
}

export async function deleteTransactions(userId: string, ids: Id[]) {
  const { error } = await supabase.from('finance_transactions').delete().in('id', ids).eq('user_id', userId);
  if (error) throw error;
}
