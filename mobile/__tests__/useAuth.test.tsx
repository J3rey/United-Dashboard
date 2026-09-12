import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AuthError, type Session } from '@supabase/supabase-js';

jest.mock('../lib/supabase', () => ({ supabase: { auth: {
  getSession: jest.fn(), onAuthStateChange: jest.fn(), signInWithPassword: jest.fn(), signOut: jest.fn(),
} }, sessionStorageKey: 'sb-test-auth-token' }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const session: Session = { access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user: { id: 'account-a', email: 'a@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-09-12T00:00:00Z' } };
let listener: Parameters<typeof supabase.auth.onAuthStateChange>[0];

beforeEach(() => {
  jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session }, error: null });
  jest.mocked(supabase.auth.onAuthStateChange).mockImplementation(callback => {
    listener = callback;
    return { data: { subscription: { id: 'test-subscription', callback, unsubscribe: jest.fn() } } };
  });
});

test('restores the saved session into the shared auth state', async () => {
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.user?.id).toBe('account-a'));
});

test('signed out starts at sign-in until demo is explicitly chosen', async () => {
  jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.user).toBeNull());
  expect(result.current.demo).toBe(false);
  await act(() => result.current.continueDemo());
  expect(result.current.demo).toBe(true);
});

test('late session restoration cannot undo a sign-out event', async () => {
  let restore!: (value: Awaited<ReturnType<typeof supabase.auth.getSession>>) => void;
  jest.mocked(supabase.auth.getSession).mockReturnValue(new Promise(resolve => { restore = resolve; }));
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(() => listener('SIGNED_OUT', null));
  await act(async () => restore({ data: { session }, error: null }));
  expect(result.current.user).toBeNull();
});

test('failed sign-out keeps the current account and surfaces the failure', async () => {
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.user?.id).toBe('account-a'));
  const error = new AuthError('Network unavailable');
  jest.mocked(supabase.auth.signOut).mockResolvedValue({ error });
  await expect(result.current.logout()).rejects.toThrow('Network unavailable');
  expect(result.current.user?.id).toBe('account-a');
});

test('successful sign-out clears the session and returns to sign-in', async () => {
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.user?.id).toBe('account-a'));
  jest.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
  await act(async () => result.current.logout());
  expect(result.current.user).toBeNull();
  expect(result.current.demo).toBe(false);
});
