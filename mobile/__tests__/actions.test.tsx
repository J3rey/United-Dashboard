import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ActionsProvider, useActions } from '../hooks/useActions';
import { DataProvider, useData } from '../hooks/useAppData';
import * as db from '../lib/db';
import * as native from '../lib/nativeDb';
import { defaultState } from '../lib/defaultState';
import type { ReactNode } from 'react';
let mockUser: { id: string } | null = { id: 'account-a' };
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../lib/db', () => ({ fetchAll: jest.fn(), deleteTransaction: jest.fn() }));
jest.mock('../lib/nativeDb', () => ({ insertOrderedTransaction: jest.fn() }));
function Wrapper({ children }: { children: ReactNode }) { return <DataProvider><ActionsProvider>{children}</ActionsProvider></DataProvider>; }
function useSubject() { return { actions: useActions(), data: useData() }; }
beforeEach(() => { mockUser = { id: 'account-a' }; jest.mocked(db.fetchAll).mockReset().mockResolvedValue(defaultState); jest.mocked(db.deleteTransaction).mockReset().mockResolvedValue(); });
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
