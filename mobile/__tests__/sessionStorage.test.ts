import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, sessionStorageKey } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

test('a cold client reads the existing session from AsyncStorage', async () => {
  const saved: Session = {
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'saved-account', email: 'saved@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-09-12T00:00:00Z' },
  };
  await AsyncStorage.setItem(sessionStorageKey, JSON.stringify(saved));
  const { data, error } = await supabase.auth.getSession();
  expect(error).toBeNull();
  expect(data.session?.user.id).toBe('saved-account');
  expect(data.session?.refresh_token).toBe('test-refresh-token');
  supabase.auth.stopAutoRefresh();
});
