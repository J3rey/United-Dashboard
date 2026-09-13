import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ActionsProvider, useActions } from '../hooks/useActions';
import { DataProvider, useData } from '../hooks/useAppData';
import * as db from '../lib/db';
import * as native from '../lib/nativeDb';
import { defaultState } from '../lib/defaultState';
import type { ReactNode } from 'react';
import type { Debt } from '../lib/types';
let mockUser: { id: string } | null = { id: 'account-a' };
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../lib/db', () => ({ fetchAll: jest.fn(), deleteTransaction: jest.fn(), insertDebt: jest.fn(), updateDebt: jest.fn(), deleteDebt: jest.fn() }));
jest.mock('../lib/nativeDb', () => ({ insertOrderedTransaction: jest.fn() }));
function Wrapper({ children }: { children: ReactNode }) { return <DataProvider><ActionsProvider>{children}</ActionsProvider></DataProvider>; }
function useSubject() { return { actions: useActions(), data: useData() }; }
beforeEach(() => { mockUser = { id: 'account-a' }; jest.mocked(db.fetchAll).mockReset().mockResolvedValue(defaultState); jest.mocked(db.deleteTransaction).mockReset().mockResolvedValue(); jest.mocked(db.insertDebt).mockReset().mockResolvedValue('server-debt'); jest.mocked(db.updateDebt).mockReset().mockResolvedValue(); jest.mocked(db.deleteDebt).mockReset().mockResolvedValue(); });
test('undo within four seconds restores the row without a delete request', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.useFakeTimers();
  await act(() => result.current.actions.deleteExpense(1));
  expect(result.current.data.state.expenses.some(row => row.id === 1)).toBe(false);
  await act(() => result.current.actions.undo());
  await act(() => jest.advanceTimersByTime(4000));
  expect(result.current.data.state.expenses.some(row => row.id === 1)).toBe(true);
  expect(db.deleteTransaction).not.toHaveBeenCalled();
  jest.useRealTimers();
});
test('remote deletion happens only after the four-second undo window', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.useFakeTimers();
  await act(() => result.current.actions.deleteExpense(1));
  await act(() => jest.advanceTimersByTime(3999));
  expect(db.deleteTransaction).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(1));
  expect(db.deleteTransaction).toHaveBeenCalledWith(1);
  jest.useRealTimers();
});
test('a failed optimistic insert rolls back and exposes retry', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.mocked(native.insertOrderedTransaction).mockRejectedValueOnce(new Error('Offline'));
  const before = result.current.data.state.expenses.length;
  await act(async () => result.current.actions.saveExpense({ date: '2026-09-12', cat: 'Food', detail: 'Coffee', cost: 5, type: 'normal', person: '' }));
  expect(result.current.data.state.expenses).toHaveLength(before);
  expect(result.current.actions.failure?.message).toContain('Couldn’t save that expense');
  expect(result.current.actions.failure?.retry).toBeDefined();
});

test('demo saves and deletes never call the backend', async () => {
  mockUser = null;
  jest.mocked(native.insertOrderedTransaction).mockClear();
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  jest.useFakeTimers();
  const before = result.current.data.state.expenses.length;
  await act(async () => result.current.actions.saveExpense({ date:'2026-09-12',cat:'Food',detail:'Demo',cost:4,type:'normal',person:'' }));
  expect(result.current.data.state.expenses).toHaveLength(before + 1);
  await act(() => result.current.actions.deleteExpense(1));
  await act(async () => jest.advanceTimersByTime(4000));
  expect(native.insertOrderedTransaction).not.toHaveBeenCalled();
  expect(db.deleteTransaction).not.toHaveBeenCalled();
  expect(db.fetchAll).not.toHaveBeenCalled();
  jest.useRealTimers();
});

const debtValues: Omit<Debt, 'id'> = { date: '2026-09-14', person: 'Alex', detail: '', amount: 12.5, resolved: false, resolvedAt: null };
test('debt insert is optimistic and swaps its local id for the server id', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  let finish!: (id: string) => void;
  jest.mocked(db.insertDebt).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let request!: Promise<boolean>;
  await act(() => { request = result.current.actions.saveDebt(debtValues); });
  const entry = result.current.data.state.debts.find(row => row.person === 'Alex');
  expect(entry).toMatchObject(debtValues);
  expect(entry?.id).toEqual(expect.stringMatching(/^mobile-/));
  await act(async () => { finish('server-debt'); await request; });
  expect(result.current.data.state.debts.find(row => row.person === 'Alex')).toEqual({ ...debtValues, id: 'server-debt' });
  expect(db.insertDebt).toHaveBeenCalledWith('account-a', entry);
  expect(result.current.data.state.income).toEqual(defaultState.income);
  expect(result.current.data.state.expenses).toEqual(defaultState.expenses);
});
test('failed debt insert rolls back and retry saves the same values', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.mocked(db.insertDebt).mockRejectedValueOnce(new Error('Offline'));
  await act(async () => { expect(await result.current.actions.saveDebt(debtValues)).toBe(false); });
  expect(result.current.data.state.debts).toEqual(defaultState.debts);
  expect(result.current.actions.failure?.message).toBe("Couldn't save that debt. Tap to retry.");
  await act(() => result.current.actions.failure?.retry());
  await waitFor(() => expect(result.current.actions.busy).toBe(false));
  expect(result.current.data.state.debts.find(row => row.id === 'server-debt')).toEqual({ ...debtValues, id: 'server-debt' });
});
test('debt edit updates all editable fields and sends only changes', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  const changes = { person: 'Kev', detail: '', amount: 100.25, date: '2026-08-19' };
  await act(async () => { expect(await result.current.actions.editDebt(1, changes)).toBe(true); });
  expect(result.current.data.state.debts.find(row => row.id === 1)).toEqual({ id: 1, ...changes, resolved: false, resolvedAt: null });
  expect(db.updateDebt).toHaveBeenCalledWith(1, changes);
  expect(result.current.data.state.debts.slice(1)).toEqual(defaultState.debts.slice(1));
});
test('failed debt edit restores the original row and can retry', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.mocked(db.updateDebt).mockRejectedValueOnce(new Error('Offline'));
  await act(async () => { expect(await result.current.actions.editDebt(1, { amount: 99 })).toBe(false); });
  expect(result.current.data.state.debts).toEqual(defaultState.debts);
  await act(() => result.current.actions.failure?.retry());
  await waitFor(() => expect(result.current.actions.busy).toBe(false));
  expect(result.current.data.state.debts.find(row => row.id === 1)?.amount).toBe(99);
});
test('resolve stamps the local date and reopen clears it without adding income', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 14, 0, 30));
  await act(async () => { expect(await result.current.actions.resolveDebt(1, true)).toBe(true); });
  expect(result.current.data.state.debts.find(row => row.id === 1)).toMatchObject({ resolved: true, resolvedAt: '2026-09-14' });
  expect(db.updateDebt).toHaveBeenLastCalledWith(1, { resolved: true, resolvedAt: '2026-09-14' });
  await act(async () => { expect(await result.current.actions.resolveDebt(1, false)).toBe(true); });
  expect(result.current.data.state.debts.find(row => row.id === 1)).toMatchObject({ resolved: false, resolvedAt: null });
  expect(db.updateDebt).toHaveBeenLastCalledWith(1, { resolved: false, resolvedAt: null });
  expect(result.current.data.state.income).toEqual(defaultState.income);
  expect(result.current.data.state.expenses).toEqual(defaultState.expenses);
  jest.useRealTimers();
});
test('debt delete undo restores the original position without a remote delete', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.useFakeTimers();
  await act(() => result.current.actions.deleteDebt(2));
  expect(result.current.data.state.debts.some(row => row.id === 2)).toBe(false);
  expect(result.current.actions.undoMessage).toBe('Debt deleted');
  await act(() => result.current.actions.undo());
  await act(() => jest.advanceTimersByTime(4000));
  expect(result.current.data.state.debts).toEqual(defaultState.debts);
  expect(db.deleteDebt).not.toHaveBeenCalled();
  jest.useRealTimers();
});
test('debt remote deletion waits the full four seconds', async () => {
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data.loading).toBe(false));
  jest.useFakeTimers();
  await act(() => result.current.actions.deleteDebt(1));
  await act(() => jest.advanceTimersByTime(3999));
  expect(db.deleteDebt).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(db.deleteDebt).toHaveBeenCalledWith(1);
  expect(result.current.data.state.debts.some(row => row.id === 1)).toBe(false);
  jest.useRealTimers();
});
test('demo debt save edit resolve and delete never write to the backend', async () => {
  mockUser = null;
  const { result } = await renderHook(useSubject, { wrapper: Wrapper });
  jest.useFakeTimers();
  await act(async () => { await result.current.actions.saveDebt(debtValues); });
  expect(result.current.data.state.debts).toHaveLength(6);
  await act(async () => { await result.current.actions.editDebt(1, { person: 'Kev' }); });
  await act(async () => { await result.current.actions.resolveDebt(1, true); });
  expect(result.current.data.state.debts.find(row => row.id === 1)).toMatchObject({ person: 'Kev', resolved: true });
  await act(() => result.current.actions.deleteDebt(1));
  await act(async () => jest.advanceTimersByTime(4000));
  expect(result.current.data.state.debts.some(row => row.id === 1)).toBe(false);
  expect(db.insertDebt).not.toHaveBeenCalled();
  expect(db.updateDebt).not.toHaveBeenCalled();
  expect(db.deleteDebt).not.toHaveBeenCalled();
  jest.useRealTimers();
});
