import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon } from '../../components/TabShell';
import { colors, fonts } from '../../theme';
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs initialRouteName="finance" screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.moss, tabBarInactiveTintColor: colors.ink3, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 56 + insets.bottom, paddingTop: 5, paddingBottom: insets.bottom, elevation: 0, shadowOpacity: 0 }, tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 }, sceneStyle: { backgroundColor: colors.paper } }}>
    <Tabs.Screen name="finance" options={{ title: 'Finance', tabBarIcon: ({ color }) => <TabIcon name="wallet" color={color}/> }}/>
    <Tabs.Screen name="habits" options={{ title: 'Habits', tabBarIcon: ({ color }) => <TabIcon name="check" color={color}/> }}/>
    <Tabs.Screen name="content" options={{ title: 'Content', tabBarIcon: ({ color }) => <TabIcon name="film" color={color}/> }}/>
  </Tabs>;
}
