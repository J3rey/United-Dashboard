import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useAppData';
import { colors, fonts, type } from '../theme';
import { Icon } from './Icon';
import { IconButton } from './ui';
import { LoadError } from './LoadError';
export function Page({ title, children, actions, back = false, hideSettings = false, needsData = true }: { title: string; children: ReactNode; actions?: ReactNode; back?: boolean; hideSettings?: boolean; needsData?: boolean }) {
  const router = useRouter(), insets = useSafeAreaInsets(), data = useData();
  return <View style={styles.screen}>
    <View style={[styles.header, { paddingTop: insets.top }]}>{back && <IconButton name="back" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')}/>}<Text style={[back ? type.screenTitle : type.title, styles.title]}>{title}</Text>{actions}{!back && !hideSettings && <IconButton name="gear" label="Settings" onPress={() => router.push('/settings')}/>}</View>
    {data.isDemo && <DemoBanner/>}
    {needsData && data.error ? <LoadError error={data.error} retry={data.refetch} demo={data.useDemo}/> : children}
  </View>;
}
export function DemoBanner() {
  const router = useRouter(), auth = useAuth(), data = useData();
  return <View style={styles.banner}><Icon name="info" color={colors.noticeInk} size={18}/><Text style={styles.bannerCopy}><Text style={styles.bold}>Demo data.</Text> Nothing you change here is saved.</Text><Pressable accessibilityRole="button" onPress={() => auth.user ? data.refetch() : router.push('/sign-in')} style={styles.signIn}><Text style={styles.signInText}>{auth.user ? 'Try syncing again.' : 'Sign in to keep it.'}</Text></Pressable></View>;
}
export function TabIcon({ name, color }: { name: 'wallet' | 'check' | 'film'; color: ColorValue }) { return <Icon name={name} color={color} size={23}/>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.paper }, header: { backgroundColor: colors.paper, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 2 }, title: { flex: 1 }, banner: { marginHorizontal: 16, marginBottom: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.noticeBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.amberLight }, bannerCopy: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.noticeInk, lineHeight: 18 }, bold: { fontFamily: fonts.semibold }, signIn: { minHeight: 44, minWidth: 44, justifyContent: 'center' }, signInText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.noticeInk } });
