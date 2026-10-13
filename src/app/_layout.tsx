import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LoadingScreen } from '@/components/logo';
import { Button } from '@/components/ui';
import { loadContent } from '@/data/catalog';
import { queryClient } from '@/lib/queries';
import { useSession } from '@/store/session';
import { colors, fonts } from '@/theme/tokens';

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
  const session = useSession((s) => s.status);
  // Subjects, courses and exam dates come from the API (or the copy saved on the last launch).
  const [content, setContent] = useState<'loading' | 'ready' | 'offline'>('loading');
  const fetchContent = useCallback(() => {
    loadContent().then((ok) => setContent(ok ? 'ready' : 'offline'));
  }, []);
  const retryContent = () => {
    setContent('loading');
    fetchContent();
  };
  // A font that fails to load falls back to the system face instead of blocking the app.
  const ready = (fontsLoaded || !!fontError) && content !== 'loading' && session !== 'loading';
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);
  const hide = ready && minElapsed;
  const opacity = useSharedValue(1);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Reads the session saved on the device (if any) before deciding between login and the app.
  useEffect(() => {
    useSession.getState().restore();
    fetchContent();
  }, [fetchContent]);

  // Swap the static native splash for the animated loading screen right away.
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
      {ready ? content === 'ready' ? <App /> : <Offline onRetry={retryContent} /> : null}
      {gone ? null : (
        <Animated.View pointerEvents={hide ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, fade]}>
          <LoadingScreen />
        </Animated.View>
      )}
    </>
  );
}

// First launch without internet: there is no saved copy of the content to open with yet.
function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.offline}>
      <Text style={styles.offlineTitle}>Sem conexão</Text>
      <Text style={styles.offlineText}>Na primeira vez, o FocaAI precisa de internet para baixar o conteúdo.</Text>
      <Button label="Tentar de novo" onPress={onRetry} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

function App() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.ink },
          }}>
          <Stack.Screen name="index" />
          {/* Everything past the welcome screen needs a signed-in account; signing out lands back on it. */}
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="semana" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="perfil" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen
              name="simulado"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="resultado/[id]" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  offline: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  offlineTitle: {
    fontFamily: fonts.title,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
  },
  offlineText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
