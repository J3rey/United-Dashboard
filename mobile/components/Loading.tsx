import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
export function Loading() {
  return <View style={styles.screen} accessibilityRole="progressbar" accessibilityLabel="Loading your dashboard">
    <Image source={require('../assets/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors />
    <Text style={styles.copy}>Loading your dashboard…</Text>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', paddingBottom: 70, gap: 16 },
  logo: { width: 36, height: 36, opacity: 0.85 },
  copy: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.ink3 },
});
