import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, numbers, type } from '../theme';
import { Icon } from './Icon';
export function LoadError({ error, retry, demo }: { error: string; retry: () => void; demo: () => void }) {
  return <View style={styles.screen}>
    <View style={styles.icon}><Icon name="info" color={colors.red}/></View>
    <Text style={styles.title}>Couldn’t load your data</Text>
    <Text style={styles.description}>The server didn’t answer. Your data is safe — this device just couldn’t reach it.</Text>
    <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>Try again</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={demo} style={styles.demo}><Text style={styles.demoText}>Use demo data instead</Text></Pressable>
    <Text style={styles.error} selectable>{error}</Text>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', paddingHorizontal: 32, justifyContent: 'center', paddingBottom: 60 },
  icon: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.errorBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { ...type.screenTitle, fontSize: 16, textAlign: 'center', marginBottom: 5 },
  description: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink3, textAlign: 'center', maxWidth: 260, marginBottom: 18, lineHeight: 19 },
  button: { minHeight: 50, minWidth: 210, borderRadius: 13, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.surface },
  demo: { minHeight: 44, minWidth: 210, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  demoText: { ...type.body, color: colors.ink2 },
  error: { ...numbers, ...type.label, fontSize: 11, marginTop: 22, textAlign: 'center' },
  pressed: { opacity: 0.8 },
});
