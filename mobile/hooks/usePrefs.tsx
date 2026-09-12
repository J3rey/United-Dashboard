import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATS, type Category } from '../lib/constants';
import { dateString } from '../lib/format';
export type OpenOn = 'month' | 'last';
function usePreferenceState() {
  const [category, setCategory] = useState<Category>('Food');
  const [openOn, setOpenOn] = useState<OpenOn>('month');
  const [lastMonth, setLastMonth] = useState(dateString().slice(0, 7));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet(['ud:category','ud:open-on','ud:last-month']).then(values => {
      if (!active) return;
      const savedCategory = values[0]?.[1];
      const known = CATS.find(cat => cat === savedCategory); if (known) setCategory(known);
      if (values[1]?.[1] === 'last') setOpenOn('last');
      const month = values[2]?.[1]; if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) setLastMonth(month);
      setReady(true);
    }).catch(() => { if (active) { setError('Couldn’t restore your preferences.'); setReady(true); } });
    return () => { active = false; };
  }, []);
  async function saveCategory(value: Category) { await AsyncStorage.setItem('ud:category', value); setCategory(value); }
  async function saveOpenOn(value: OpenOn) { await AsyncStorage.setItem('ud:open-on', value); setOpenOn(value); }
  async function saveMonth(value: string) { await AsyncStorage.setItem('ud:last-month', value); setLastMonth(value); }
  return { category, openOn, lastMonth, ready, error, saveCategory, saveOpenOn, saveMonth };
}
const Context = createContext<ReturnType<typeof usePreferenceState> | null>(null);
export function PrefsProvider({ children }: { children: ReactNode }) { const value = usePreferenceState(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function usePrefs() { const value = useContext(Context); if (!value) throw new Error('usePrefs requires PrefsProvider'); return value; }
