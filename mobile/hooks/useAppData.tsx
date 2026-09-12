import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import { defaultState } from '../lib/defaultState';
import type { AppState } from '../lib/types';
import * as db from '../lib/db';
import { useAuth } from './useAuth';

const emptyUserState: AppState = {
  ...defaultState, events: [], expenses: [], income: [], habits: [], habitChecks: {}, pillars: [], content: [],
};

export function useAppData(user: User | null | undefined) {
  const [state, setStateRaw] = useState(defaultState);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [demoFor, setDemoFor] = useState<string | null>(null);
  const userId = user?.id;
  useEffect(() => { setDemoFor(null); }, [userId]);
  const isDemo = !userId || demoFor === userId;

  useEffect(() => {
    if (!userId || demoFor === userId) {
      setStateRaw(defaultState);
      setLoading(false);
      setError(null);
      setLoadedFor(userId ?? null);
      return;
    }
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setStateRaw(emptyUserState);
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      active = false;
      setLoadedFor(userId);
      setError('The server did not answer within eight seconds.');
      setLoading(false);
    }, 8000);
    const load = async () => {
      try {
        return await db.fetchAll(userId);
      } catch (err: unknown) {
        if (!(typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' && err.message.includes('JWT issued at future'))) throw err;
        await new Promise<void>(resolve => { retryTimer = setTimeout(resolve, 2000); });
        if (!active) return;
        return db.fetchAll(userId);
      }
    };
    load().then(data => {
      if (!active || !data) return;
      clearTimeout(timeout);
      setStateRaw(data);
      setLoadedFor(userId);
      setLoading(false);
    }).catch((err: unknown) => {
      if (!active) return;
      clearTimeout(timeout);
      console.info('fetchAll failed', err);
      setStateRaw(emptyUserState);
      setLoadedFor(userId);
      setError(typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? err.message : 'Failed to load dashboard data');
      setLoading(false);
    });
    return () => { active = false; clearTimeout(timeout); clearTimeout(retryTimer); };
  }, [userId, attempt, demoFor]);

  const setState: Dispatch<SetStateAction<AppState>> = updater => {
    setStateRaw(prev => typeof updater === 'function' ? updater(prev) : updater);
  };
  function refetch() { setDemoFor(null); setAttempt(value => value + 1); }
  function useDemo() { setDemoFor(userId ?? null); setStateRaw(defaultState); setError(null); setLoading(false); }
  function clear() { setStateRaw(emptyUserState); setError(null); }

  return {
    state: userId && loadedFor !== userId ? emptyUserState : state, setState,
    loading: !isDemo && (loading || loadedFor !== userId), error, isDemo, refetch, useDemo, clear,
  };
}

const DataContext = createContext<ReturnType<typeof useAppData> | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const data = useAppData(user);
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}
export function useData() {
  const data = useContext(DataContext);
  if (!data) throw new Error('useData requires DataProvider');
  return data;
}
