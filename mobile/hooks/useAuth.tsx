import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { sessionStorageKey, supabase } from '../lib/supabase';

function useAuthState() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [demo, setDemo] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    const startedAt = revision.current;
    const timeout = setTimeout(() => {
      if (active) setRestoreError('The server did not answer while restoring your session.');
    }, 8000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      revision.current += 1;
      if (!active) return;
      clearTimeout(timeout);
      setRestoreError(null);
      setUser(session?.user ?? null);
      if (session) setDemo(false);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || startedAt !== revision.current) return;
      clearTimeout(timeout);
      if (error) { setRestoreError(error.message); return; }
      setUser(data.session?.user ?? null);
      setRestoreError(null);
    }).catch((error: unknown) => {
      if (!active || startedAt !== revision.current) return;
      clearTimeout(timeout);
      setRestoreError(error instanceof Error ? error.message : 'Could not restore your session.');
    });
    return () => { active = false; clearTimeout(timeout); subscription.unsubscribe(); };
  }, [attempt]);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    revision.current += 1;
    setUser(data.user);
    setDemo(false);
    setRestoreError(null);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await AsyncStorage.removeItem(sessionStorageKey);
    revision.current += 1;
    setUser(null);
    setDemo(false);
    setRestoreError(null);
  }

  function continueDemo() {
    revision.current += 1;
    setUser(null);
    setDemo(true);
    setRestoreError(null);
  }

  function retryRestore() {
    setRestoreError(null);
    setAttempt(value => value + 1);
  }

  return { user, login, logout, demo, continueDemo, restoreError, retryRestore };
}

const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth requires AuthProvider');
  return auth;
}
