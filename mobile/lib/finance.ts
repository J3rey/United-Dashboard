import type { EventEnd, EventHeader, Expense, Transaction } from './types';

// Carried over from Finance.jsx, including stable date ties.
export function insertByDate(rows: Transaction[], entry: Transaction) {
  const out = [...rows];
  let idx = out.length;
  for (let i = out.length - 1; i >= 0; i--) {
    if ((out[i].date || '') <= (entry.date || '')) { idx = i + 1; break; }
    else idx = i;
  }
  out.splice(idx, 0, entry);
  return out;
}
export function sortRowsByDate(rows: Transaction[]) {
  return rows.map((row, index) => ({ row, index })).sort((a, b) => {
    const dateA = a.row.date || '9999-12-31', dateB = b.row.date || '9999-12-31';
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    return a.index - b.index;
  }).map(({ row }) => row);
}
export function insertExpenseBeforeEnd(rows: Transaction[], entry: Expense) {
  const end = rows.findIndex(row => row.isEnd && row.date === entry.date);
  if (end < 0) return insertByDate(rows, entry);
  const out = [...rows]; out.splice(end, 0, entry); return out;
}
export type LedgerSection = { key: string; date: string; data: Expense[]; total: number; marker?: EventHeader | EventEnd };
export function transactionSections(rows: Transaction[]): LedgerSection[] {
  const sections: LedgerSection[] = [];
  for (const row of rows) {
    if (row.isHeader || row.isEnd) { sections.push({ key: String(row.id), date: row.date, data: [], total: 0, marker: row }); continue; }
    let section = sections[sections.length - 1];
    if (!section || section.marker || section.date !== row.date) {
      section = { key: `day-${row.date}-${row.id}`, date: row.date, data: [], total: 0 }; sections.push(section);
    }
    section.data.push(row); section.total += row.cost;
  }
  return sections;
}
