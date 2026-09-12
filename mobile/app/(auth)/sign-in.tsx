import { useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, type } from '../../theme';
import { Icon } from '../../components/Icon';

export default function SignIn() {
  const router = useRouter();
  const { login, continueDemo } = useAuth();
  const passwordInput = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  async function signIn() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/finance');
    } catch (err: unknown) {
      console.info('Sign-in failed', err);
      if (err instanceof AuthApiError && err.code === 'invalid_credentials') {
        setError('That email and password don’t match. Check the password, or use the web dashboard to reset it.');
      } else if (err instanceof AuthRetryableFetchError || (err instanceof TypeError && /network|fetch/i.test(err.message))) {
        setError('Can’t reach the server. Check your connection and try again.');
      } else {
        setError('Sign-in failed. Try again in a moment.');
      }
      setPassword('');
      passwordInput.current?.focus();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setPending(false);
    }
  }

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={false}>
        <View style={styles.form}>
          <View style={styles.wordmark}><Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors/><Text style={styles.brand}>dashboard</Text></View>
          {error && <View style={styles.errorBanner} accessibilityRole="alert"><Icon name="info" color={colors.errorInk} size={18}/><Text style={styles.errorText}>{error}</Text></View>}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput accessibilityLabel="Email" autoFocus autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" value={email} onChangeText={value => { setEmail(value); setError(null); }} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="you@email.com" placeholderTextColor={colors.ink3} selectionColor={colors.moss} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordInput.current?.focus()} editable={!pending} style={[styles.input, focused === 'email' && styles.focused]}/>
          </View>
          <View style={[styles.field, styles.passwordField]}>
            <Text style={styles.label}>Password</Text>
            <TextInput ref={passwordInput} accessibilityLabel="Password" autoCapitalize="none" autoCorrect={false} textContentType="password" autoComplete="current-password" secureTextEntry value={password} onChangeText={value => { setPassword(value); setError(null); }} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} placeholder="••••••••" placeholderTextColor={colors.ink3} selectionColor={colors.moss} returnKeyType="go" submitBehavior="submit" onSubmitEditing={signIn} editable={!pending} style={[styles.input, focused === 'password' && styles.focused]}/>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign in" accessibilityState={{ disabled: pending, busy: pending }} disabled={pending} onPress={signIn} style={({ pressed }) => [styles.primary, (pressed || pending) && styles.dim]}>
            {pending ? <ActivityIndicator color={colors.surface}/> : <Text style={styles.primaryText}>Sign in</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={pending} onPress={() => { continueDemo(); router.replace('/finance'); }} style={styles.demo}><Text style={styles.demoText}>Continue without an account</Text></Pressable>
        </View>
        <Text style={styles.footer}>Signing in syncs the same money, habits and ideas you see on the web dashboard.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1 },
  form: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 60 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 44 },
  logo: { width: 36, height: 36 },
  brand: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.77, color: colors.ink },
  field: { marginBottom: 13 }, passwordField: { marginBottom: 22 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink2, marginBottom: 5 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 15.5, color: colors.ink },
  focused: { borderColor: colors.moss },
  primary: { minHeight: 50, borderRadius: 13, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.semibold, fontSize: 15.5, letterSpacing: -0.155, color: colors.surface },
  dim: { opacity: 0.75 },
  demo: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  demoText: { ...type.body, fontSize: 14, color: colors.ink2 },
  footer: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.ink3, paddingHorizontal: 40, paddingBottom: 34, textAlign: 'center', lineHeight: 17.25 },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.errorBackground, borderWidth: 1, borderColor: colors.errorBorder, borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { fontFamily: fonts.regular, flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.errorInk },
});
