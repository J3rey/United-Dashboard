import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAppData } from '../hooks/useAppData';
import * as db from '../lib/db';
import { defaultState } from '../lib/defaultState';
import type { User } from '@supabase/supabase-js';

jest.mock('../lib/db', () => ({ fetchAll: jest.fn() }));
const user: User = { id: 'account-a', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-09-12T00:00:00Z' };

test('JWT clock skew waits two seconds and retries only once', async () => {
  jest.useFakeTimers();
  jest.mocked(db.fetchAll).mockRejectedValueOnce(new Error('JWT issued at future')).mockResolvedValueOnce(defaultState);
  const { result } = await renderHook(() => useAppData(user));
  await act(async () => {});
  expect(result.current.loading).toBe(true);
  expect(db.fetchAll).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(1999));
  expect(db.fetchAll).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(1));
  expect(db.fetchAll).toHaveBeenCalledTimes(2);
  expect(result.current.error).toBeNull();
  expect(result.current.loading).toBe(false);
  jest.useRealTimers();
});

test('other load failures keep account data empty and do not retry', async () => {
  const log = jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.mocked(db.fetchAll).mockRejectedValueOnce(new Error('Network request failed'));
  const { result } = await renderHook(() => useAppData(user));
  await waitFor(() => expect(result.current.error).toBe('Network request failed'));
  expect(db.fetchAll).toHaveBeenCalledTimes(1);
  expect(result.current.state.expenses).toEqual([]);
  expect(result.current.isDemo).toBe(false);
  log.mockRestore();
});

test('a late account request cannot overwrite demo state after sign-out', async () => {
  let resolve!: (value: typeof defaultState) => void;
  jest.mocked(db.fetchAll).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { result, rerender } = await renderHook(({ currentUser }: { currentUser: User | null }) => useAppData(currentUser), { initialProps: { currentUser: user } });
  await rerender({ currentUser: null });
  await act(async () => resolve({ ...defaultState, expenses: [] }));
  expect(result.current.state.expenses).toEqual(defaultState.expenses);
  expect(result.current.isDemo).toBe(true);
});

test('a hung load becomes a recoverable error after eight seconds', async () => {
  jest.useFakeTimers();
  jest.mocked(db.fetchAll).mockReturnValueOnce(new Promise(() => {}));
  const { result } = await renderHook(() => useAppData(user));
  await act(async () => jest.advanceTimersByTime(8000));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toContain('server');
  jest.useRealTimers();
});

beforeEach(() => jest.mocked(db.fetchAll).mockReset());
