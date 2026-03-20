import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-device" options={{ headerShown: false }} />
        <Stack.Screen name="scan-device" options={{ headerShown: false }} />
        <Stack.Screen name="connected" options={{ headerShown: false }} />
        <Stack.Screen name="automation-create" options={{ headerShown: false }} />
        <Stack.Screen name="automation-condition" options={{ headerShown: false }} />
        <Stack.Screen name="automation-schedule" options={{ headerShown: false }} />
        <Stack.Screen name="automation-action" options={{ headerShown: false }} />
        <Stack.Screen name="device/[deviceId]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
