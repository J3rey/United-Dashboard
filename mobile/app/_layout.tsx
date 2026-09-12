import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { DataProvider, useData } from '../hooks/useAppData';
import { ActionsProvider } from '../hooks/useActions';
import { PrefsProvider } from '../hooks/usePrefs';
import { UndoToast } from '../components/UndoToast';
import { Loading } from '../components/Loading';
import { LoadError } from '../components/LoadError';
import { colors, fonts } from '../theme';

SplashScreen.preventAutoHideAsync();

function Shell() {
  const auth = useAuth();
  const data = useData();
  const [fontsLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  const restoring = auth.user === undefined;
  useEffect(() => {
    if (fontError) throw fontError;
    if (fontsLoaded && (!restoring || auth.restoreError)) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, restoring, auth.restoreError]);

  return <View style={styles.root}>
    <StatusBar style="dark"/>
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.paper }, headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 19 }, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }}/>
      <Stack.Protected guard={Boolean(auth.user) || auth.demo}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }}/>
        <Stack.Screen name="converter" options={{ headerShown: false }}/><Stack.Screen name="settings" options={{ title: 'Settings', headerShown: false }}/>
      </Stack.Protected>
      <Stack.Protected guard={auth.user === null}>
        <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false, presentation: auth.demo ? 'modal' : 'card' }}/>
      </Stack.Protected>
    </Stack>
    <UndoToast/>
    {(!fontsLoaded || restoring || data.loading) && <View style={styles.gate}>
      {fontsLoaded && auth.restoreError ? <LoadError error={auth.restoreError} retry={auth.retryRestore} demo={auth.continueDemo}/> : <Loading/>}
    </View>}
  </View>;
}
export default function RootLayout() {
  return <GestureHandlerRootView style={styles.root}><SafeAreaProvider><AuthProvider><DataProvider><PrefsProvider><ActionsProvider><BottomSheetModalProvider><Shell/></BottomSheetModalProvider></ActionsProvider></PrefsProvider></DataProvider></AuthProvider></SafeAreaProvider></GestureHandlerRootView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.paper }, gate: { ...StyleSheet.absoluteFill, backgroundColor: colors.paper } });
