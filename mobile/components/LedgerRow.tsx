import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useActions } from '../hooks/useActions';
import { CAT_COLORS } from '../lib/constants';
import { money } from '../lib/format';
import type { Expense } from '../lib/types';
import { colors, numbers, type } from '../theme';
import { Icon } from './Icon';
export function SwipeRow({ children, onDelete, label }: { children: ReactNode; onDelete: () => void; label: string }) {
  const { busy } = useActions();
  const ref = useRef<SwipeableMethods>(null);
  return <Swipeable ref={ref} overshootRight={false} renderRightActions={() => <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${label}`} disabled={busy} accessibilityState={{disabled:busy}} onPress={() => { ref.current?.close(); onDelete(); }} style={styles.delete}><Icon name="trash" color={colors.surface}/><Text style={styles.deleteText}>Delete</Text></Pressable>}>{children}</Swipeable>;
}
export function LedgerRow({ expense, onPress, onDelete, first, last }: { expense: Expense; onPress: () => void; onDelete: () => void; first?: boolean; last?: boolean }) {
  return <SwipeRow label={expense.detail} onDelete={onDelete}><Pressable accessibilityRole="button" accessibilityLabel={`${expense.detail}, ${money(expense.cost)}, ${expense.cat}`} onPress={onPress} style={({ pressed }) => [styles.row, first && styles.first, last && styles.last, pressed && { backgroundColor: colors.surface2 }]}>
    <View style={[styles.dot, { backgroundColor: CAT_COLORS[expense.cat] }]}/><View style={styles.mid}><Text style={type.body} numberOfLines={1}>{expense.detail}</Text><View style={styles.subtitle}><Text style={type.label}>{expense.cat}</Text>{expense.type !== 'normal' && <Text style={[styles.badge, expense.type === 'paid' ? styles.paid : styles.for]}>{expense.type}{expense.person ? ` · ${expense.person}` : ''}</Text>}</View></View><Text style={styles.amount}>{money(expense.cost)}</Text>
  </Pressable></SwipeRow>;
}
const styles = StyleSheet.create({
  row: { minHeight: 56, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, first: { borderTopLeftRadius: 14, borderTopRightRadius: 14 }, last: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }, dot: { width: 9, height: 9, borderRadius: 5 }, mid: { flex: 1 }, subtitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }, amount: { ...type.body, ...numbers, fontSize: 15, fontWeight: '600' }, badge: { ...type.label, fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }, paid: { color: colors.amber, backgroundColor: colors.amberLight }, for: { color: colors.blue, backgroundColor: colors.blueLight }, delete: { width: 76, minHeight: 56, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', gap: 3 }, deleteText: { ...type.label, color: colors.surface },
});
