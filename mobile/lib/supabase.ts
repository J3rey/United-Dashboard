import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Set the Supabase project URL and public anon key in mobile/.env.');
export const sessionStorageKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
export const supabase = createClient<Database>(url, key, {
  auth: { storage: AsyncStorage, storageKey: sessionStorageKey, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
