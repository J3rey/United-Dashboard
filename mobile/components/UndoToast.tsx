import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActions } from '../hooks/useActions';
import { colors, type } from '../theme';
export function UndoToast() {
  const { undoMessage, undo, failure, clearFailure } = useActions();
  const insets = useSafeAreaInsets();
  if (!undoMessage && !failure) return null;
  return <View style={[styles.toast, { bottom: 56 + insets.bottom + 12 }]} accessibilityLiveRegion="polite">
    {failure ? <><Pressable accessibilityRole="button" onPress={failure.retry} style={styles.message}><Text style={styles.copy}>{failure.message}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={clearFailure} style={styles.action}><Text style={styles.copy}>Close</Text></Pressable></> : <><Text style={[styles.copy, styles.message]}>{undoMessage}</Text><Pressable accessibilityRole="button" onPress={undo} style={styles.action}><Text style={styles.copy}>Undo</Text></Pressable></>}
  </View>;
}
const styles = StyleSheet.create({ toast: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.ink, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, copy: { ...type.body, color: colors.surface, fontSize: 13 }, message: { flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 10 }, action: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
