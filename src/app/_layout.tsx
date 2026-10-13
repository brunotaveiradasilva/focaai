import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LoadingScreen } from '@/components/logo';
import { useApp } from '@/store/app';
import { useSession } from '@/store/session';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

// Long enough for the logo animation to read as intentional rather than a flicker.
const MIN_LOADING_MS = 1400;
const FADE_MS = 350;

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink,
    card: colors.surface,
    border: colors.line,
    primary: colors.accent,
    text: colors.text,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrated = useApp((s) => s.hydrated);
  const session = useSession((s) => s.status);
  // A font that fails to load falls back to the system face instead of blocking the app.
  const ready = (fontsLoaded || !!fontError) && hydrated && session !== 'loading';
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);
  const hide = ready && minElapsed;
  const opacity = useSharedValue(1);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Swap the static native splash for the animated loading screen right away.
  // Reads the session saved on the device (if any) before deciding between login and the app.
  useEffect(() => {
    useSession.getState().restore();
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync();
    const id = setTimeout(() => setMinElapsed(true), MIN_LOADING_MS);
    return () => clearTimeout(id);
  }, []);

  // Fade out, then unmount on a plain timer: if the app is backgrounded mid-fade and
  // animation frames pause, the overlay still goes away instead of hanging over the app.
  useEffect(() => {
    if (!hide) return;
    opacity.set(withTiming(0, { duration: FADE_MS }));
    const id = setTimeout(() => setGone(true), FADE_MS + 50);
    return () => clearTimeout(id);
  }, [hide, opacity]);

  return (
    <>
      {ready ? <App /> : null}
      {gone ? null : (
        <Animated.View pointerEvents={hide ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, fade]}>
          <LoadingScreen />
        </Animated.View>
      )}
    </>
  );
}

function App() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
        <Stack.Screen name="index" />
        {/* Everything past the welcome screen needs a signed-in account; signing out lands back on it. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="semana" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="perfil" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="simulado" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="resultado/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
