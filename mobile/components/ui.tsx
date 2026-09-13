import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BackHandler, useWindowDimensions, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { DatePicker } from './DatePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReduceMotion } from 'react-native-reanimated';
import { colors, fonts, numbers, type } from '../theme';
import { dateLabel, dateString } from '../lib/format';
import { CATS, CAT_COLORS, type Category } from '../lib/constants';
import { useActions } from '../hooks/useActions';
import { Icon, type IconName } from './Icon';

export function Button({ label, onPress, disabled, tone = 'primary' }: { label: string; onPress: () => void; disabled?: boolean; tone?: 'primary' | 'quiet' | 'danger' }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.button, tone === 'primary' && ui.primary, tone === 'danger' && ui.danger, (disabled || pressed) && ui.dim]}><Text style={[ui.buttonText, tone === 'primary' && ui.white, tone === 'danger' && ui.red]}>{label}</Text></Pressable>;
}
export function IconButton({ name, label, onPress, disabled }: { name: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.iconButton, (pressed || disabled) && ui.dim]}><Icon name={name}/></Pressable>;
}
export function Chip({ label, selected, onPress, color = colors.ink }: { label: string; selected?: boolean; onPress: () => void; color?: string }) {
  return <Pressable accessibilityRole="button" aria-pressed={selected} accessibilityState={{ selected: Boolean(selected) }} onPress={onPress} style={({ pressed }) => [ui.chip, selected && { backgroundColor: color, borderColor: color }, pressed && ui.dim]}><Text numberOfLines={1} style={[ui.chipText, numbers, selected && ui.white]}>{label}</Text></Pressable>;
}
export function Sheet({ title, subtitle, children, onClose, confirmClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; confirmClose?: (close: () => void) => void }) {
  const actions = useActions();
  const modal = useRef<BottomSheetModal>(null);
  const allowed = useRef(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const close = () => { allowed.current = true; modal.current?.dismiss(); };
  const requestClose = () => confirmClose ? confirmClose(close) : close();
  useEffect(() => { modal.current?.present(); return () => modal.current?.dismiss(); }, []);
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { requestClose(); return true; }); return () => listener.remove(); });
  return <BottomSheetModal ref={modal} stackBehavior="push" accessible={false} accessibilityRole="none" accessibilityLabel={title} enableDynamicSizing maxDynamicContentSize={(height - insets.top) * 0.9} enablePanDownToClose keyboardBehavior="interactive" android_keyboardInputMode="adjustResize" overrideReduceMotion={ReduceMotion.System} backgroundStyle={ui.sheet} handleIndicatorStyle={ui.handle} backdropComponent={props => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} pressBehavior="none" onPress={requestClose}/>} onDismiss={() => {
    if (confirmClose && !allowed.current) { modal.current?.present(); confirmClose(close); }
    else onClose();
  }}>
    <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.sheetContent, { paddingBottom: insets.bottom + 18 }]}>
      <View style={ui.line}><Text style={[type.sheetTitle, ui.flex]}>{title}</Text><IconButton name="close" label="Close" onPress={requestClose}/></View>
      {subtitle && <Text style={[type.subtitle, ui.subtitle, numbers]}>{subtitle}</Text>}
      {children}
      {actions.failure && <Button label={actions.failure.message} tone="danger" disabled={actions.busy} onPress={actions.failure.retry}/>}
    </BottomSheetScrollView>
  </BottomSheetModal>;
}
export function Field({ label, inputRef, ...props }: TextInputProps & { label: string; inputRef?: RefObject<TextInput | null> }) {
  const Input = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
  return <View style={ui.field}><Text style={ui.label}>{label}</Text><Input ref={(node: TextInput | null | undefined) => { if (inputRef) inputRef.current = node ?? null; }} {...props} accessibilityLabel={label} placeholderTextColor={colors.ink3} selectionColor={colors.moss} style={[ui.input, props.style]}/></View>;
}
export function DateField({ value, onChange, label = 'Date' }: { value: string; onChange: (date: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return <View style={ui.field}><Text style={ui.label}>{label}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={ui.input}><Text style={[type.body, numbers]}>{dateLabel(value)}</Text></Pressable>{open && <><DatePicker value={value} onChange={onChange}/><Button label="Done" tone="quiet" onPress={() => setOpen(false)}/></>}</View>;
}
export function Categories({ selected, onPress }: { selected: Category[]; onPress: (cat: Category) => void }) {
  return <View style={ui.grid}>{CATS.map(cat => <Pressable key={cat} accessibilityRole="button" aria-pressed={selected.includes(cat)} accessibilityState={{ selected: selected.includes(cat) }} onPress={() => onPress(cat)} style={[ui.category, selected.includes(cat) && ui.categorySelected]}><View style={[ui.dot, { backgroundColor: CAT_COLORS[cat] }]}/><Text style={ui.categoryText}>{cat}</Text></Pressable>)}</View>;
}
export function EditRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={ui.editRow}><Text style={[type.body, ui.flex]}>{label}</Text><Text style={[type.subtitle, numbers]}>{value}</Text><Icon name="chevron" size={16}/></Pressable>; }
export function EmptyState({ title, copy, action, onPress }: { title: string; copy: string; action: string; onPress: () => void }) {
  return <View style={ui.empty}><View style={ui.emptyIcon}><Icon name="inbox" color={colors.ink3}/></View><Text style={ui.emptyTitle}>{title}</Text><Text style={ui.emptyCopy}>{copy}</Text><Button label={action} onPress={onPress}/></View>;
}
export function Fab({ onPress, label }: { onPress: () => void; label: string }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={ui.fab}><Icon name="plus" color={colors.surface} size={25}/></Pressable>; }
export function Stat({ label, value, color = colors.ink, wide = false, action }: { label: string; value: string; color?: string; wide?: boolean; action?: ReactNode }) { return <View style={[ui.stat, wide && ui.statWide]}><View style={wide && ui.flex}><Text style={type.label}>{label}</Text><Text style={[ui.statValue, numbers, { color }, wide && ui.large]}>{value}</Text></View>{action}</View>; }
export const ui = StyleSheet.create({
  flex: { flex: 1 }, line: { flexDirection: 'row', alignItems: 'center', gap: 9 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  screen: { flex: 1, backgroundColor: colors.paper }, gutter: { paddingHorizontal: 16 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  button: { minHeight: 50, minWidth: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginVertical: 4 }, primary: { backgroundColor: colors.moss }, danger: { borderWidth: 1, borderColor: colors.errorBorder },
  buttonText: { ...numbers, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2 }, white: { color: colors.surface }, red: { color: colors.red }, dim: { opacity: 0.5 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  chip: { height: 44, minWidth: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 999, maxWidth: 220 }, chipText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.ink2 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26 }, handle: { backgroundColor: colors.border2, width: 38 }, sheetContent: { paddingHorizontal: 18, paddingTop: 2 }, subtitle: { marginBottom: 16, lineHeight: 18 },
  field: { marginBottom: 13 }, label: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink2, marginBottom: 5 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 }, category: { width: '23%', minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 11, padding: 5, alignItems: 'center', justifyContent: 'center', gap: 5 }, categorySelected: { borderColor: colors.ink, backgroundColor: colors.surface2 }, categoryText: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink2 }, dot: { width: 15, height: 15, borderRadius: 6 },
  editRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  empty: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 25, gap: 8 }, emptyIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, textAlign: 'center' }, emptyCopy: { ...type.subtitle, fontSize: 13, color: colors.ink3, textAlign: 'center', lineHeight: 19, maxWidth: 260, marginBottom: 10 },
  fab: { position: 'absolute', right: 18, bottom: 16, height: 56, width: 56, borderRadius: 19, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center', shadowColor: colors.moss, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.34, shadowRadius: 14, elevation: 5 },
  stat: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11 }, statWide: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 9 }, statValue: { fontFamily: fonts.semibold, fontSize: 21, letterSpacing: -0.63 }, large: { fontSize: 27, letterSpacing: -0.81 },
});
