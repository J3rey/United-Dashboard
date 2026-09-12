import { insertByDate, sortRowsByDate, insertExpenseBeforeEnd, transactionSections } from '../lib/finance';
import type { Expense, Transaction } from '../lib/types';
const expense: Expense = { id: 2, date: '2026-09-12', cat: 'Food', detail: 'Coffee', cost: 5, type: 'normal', person: '' };
const rows: Transaction[] = [{ id: 'h', isHeader: true, date: '2026-09-12', label: 'Trip' }, { ...expense, id: 1 }, { id: 'e', isEnd: true, headerId: 'h', date: '2026-09-12', label: 'End of Trip' }];
test('a later expense on an event end date stays inside its event', () => {
  expect(insertExpenseBeforeEnd(rows, expense).map(row => row.id)).toEqual(['h',1,2,'e']);
});
test('date inserts and date edits retain stable order within a date', () => {
  const added = insertByDate(rows, { ...expense, id: 3, date: '2026-09-10' });
  expect(sortRowsByDate(added).map(row => row.id)).toEqual([3,'h',1,'e']);
});
test('event markers split list cards without being counted as spending', () => {
  const sections = transactionSections(rows);
  expect(sections.filter(section => !section.marker).map(section => section.total)).toEqual([5]);
  expect(sections.filter(section => section.marker).map(section => section.marker?.label)).toEqual(['Trip','End of Trip']);
});
