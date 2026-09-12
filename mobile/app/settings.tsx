import { Alert } from '../lib/alert';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useAppData';
import { Button, Categories, Sheet } from '../components/ui';
import { usePrefs } from '../hooks/usePrefs';
import { Icon, type IconName } from '../components/Icon';
import { colors, fonts, numbers, type } from '../theme';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const data = useData();
  const prefs = usePrefs();
  const [categorySheet, setCategorySheet] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your data stays on the server. The app switches to demo data until you sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        setSigningOut(true);
        try {
          await auth.logout();
          data.clear();
          router.replace('/sign-in');
        } catch {
          setSigningOut(false);
          Alert.alert('Couldn’t sign out', 'Check your connection and try again.');
        }
      } },
    ]);
  }
  function toolRow(label: string, icon: IconName, onPress: () => void, value?: string) {
    return <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}><Icon name={icon}/><Text style={styles.rowLabel}>{label}</Text>{value && <Text style={styles.value}>{value}</Text>}<Icon name="chevron" size={16} color={colors.ink3}/></Pressable>;
  }
  function unavailableRow(label: string, icon: IconName, value?: string) {
    return <View accessibilityLabel={`${label}, unavailable in this preview`} accessibilityState={{ disabled: true }} style={[styles.row, styles.unavailable]}>
      <Icon name={icon}/><Text style={styles.rowLabel}>{label}</Text>{value && <Text style={styles.value}>{value}</Text>}<Icon name="chevron" size={16} color={colors.ink3}/>
    </View>;
  }
  return <View style={styles.screen}>
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')} style={styles.headerButton}><Icon name="back"/></Pressable>
      <Text style={type.screenTitle}>Settings</Text><View style={styles.headerButton}/>
    </View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.groupLabel}>Account</Text>
      <View style={styles.group}>
        {auth.user ? <>
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.initial}>{(auth.user.email ?? 'U').charAt(0).toUpperCase()}</Text></View>
            <View style={styles.account}><Text style={styles.rowLabel} selectable>{auth.user.email}</Text><Text style={styles.accountSubtitle}>Synced with the web dashboard</Text></View>
          </View>
          <Pressable accessibilityRole="button" disabled={signingOut} accessibilityState={{ disabled: signingOut }} onPress={confirmSignOut} style={({ pressed }) => [styles.row, styles.lastRow, pressed && styles.pressed]}><Icon name="out" color={colors.red}/><Text style={[styles.rowLabel, styles.destructive]}>{signingOut ? 'Signing out…' : 'Sign out'}</Text></Pressable>
        </> : <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={({ pressed }) => [styles.row, styles.lastRow, pressed && styles.pressed]}><Icon name="out"/><Text style={styles.rowLabel}>Sign in</Text><Icon name="chevron" size={16}/></Pressable>}
      </View>
      <Text style={styles.groupLabel}>Tools</Text>
      <View style={styles.group}>
        {toolRow('Currency converter', 'swap', () => router.push('/converter'))}
        {toolRow('Archived habits', 'archive', () => router.push('/habits/archived'), String(data.state.habits.filter(habit => habit.archived).length))}
        {toolRow('Content pillars', 'film', () => router.push('/content/pillars'), String(data.state.pillars.length))}
      </View>
      <Text style={styles.groupLabel}>Finance</Text>
      <View style={styles.group}>
        {toolRow('Default category', 'wallet', () => setCategorySheet(true), prefs.category)}
        {unavailableRow('Open on', 'info', 'This month')}
      </View>
      <Text style={styles.footer}>dashboard {Constants.expoConfig?.version ?? '1.0.0'} · Expo SDK {Constants.expoConfig?.sdkVersion?.split('.')[0] ?? '57'}{'\n'}Calendar lives on the web dashboard only</Text>
    </ScrollView>
    {categorySheet && <Sheet title="Default category" onClose={() => setCategorySheet(false)}><Categories selected={[prefs.category]} onPress={async value => { try { await prefs.saveCategory(value); setCategorySheet(false); } catch { Alert.alert('Couldn’t save preference', 'Try again.'); } }}/></Sheet>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  groupLabel: { ...type.label, fontSize: 12, marginBottom: 7, marginTop: 16, marginLeft: 2 },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  row: { minHeight: 52, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { ...type.body, flex: 1 }, value: { ...type.subtitle, ...numbers },
  account: { flex: 1, gap: 3 }, accountSubtitle: { ...type.subtitle, color: colors.ink3 },
  avatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.mossLight, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bold, fontSize: 14, color: colors.moss },
  destructive: { color: colors.red }, unavailable: { opacity: 0.45 }, pressed: { backgroundColor: colors.surface2 },
  footer: { ...type.label, ...numbers, fontSize: 11, textAlign: 'center', marginTop: 22, lineHeight: 18 },
});
