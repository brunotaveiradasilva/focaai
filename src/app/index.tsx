import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GoogleButton } from '@/components/google-button';
import { LogoBadge, Wordmark } from '@/components/logo';
import { Screen } from '@/components/ui';
import { useApp } from '@/store/app';
import { useSession } from '@/store/session';
import { colors, fonts } from '@/theme/tokens';

// Tela 1 — Boas-vindas e login com Google
export default function Welcome() {
  const status = useSession((s) => s.status);
  const signIn = useSession((s) => s.signIn);
  const profile = useApp((s) => s.profile);
  const routineSkipped = useApp((s) => s.routineSkipped);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'signedIn') {
    if (!profile) return <Redirect href="/onboarding" />;
    return <Redirect href={profile.routine || routineSkipped ? '/hoje' : '/semana'} />;
  }

  const enter = async (idToken: string) => {
    setError(null);
    setBusy(true);
    try {
      await signIn(idToken);
    } catch {
      setError('Não deu para entrar agora. Confira sua internet e tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll={false}
      contentStyle={styles.center}
      footer={
        <View style={styles.footer}>
          {busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <GoogleButton onIdToken={enter} onError={() => setError('O login com Google não foi concluído.')} />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.note}>Entre com sua conta Google para guardar seu plano e seu progresso.</Text>
        </View>
      }>
      <LogoBadge />
      <View style={{ height: 20 }} />
      <Wordmark />
      <View style={{ height: 12 }} />
      <Text style={styles.tagline}>Estude com direção.{'\n'}Encontre quem quer chegar ao mesmo lugar.</Text>
      <View style={styles.loop}>
        {['Objetivo', 'Plano', 'Estudo', 'Evolução', 'Pessoas'].map((w, i) => (
          <Text key={w} style={styles.loopItem}>
            {i > 0 ? <Text style={{ color: colors.line }}>{'  ·  '}</Text> : null}
            {w}
          </Text>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  footer: { flex: 1, gap: 12, alignItems: 'center' },
  tagline: { fontFamily: fonts.body, fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 24 },
  loop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 },
  loopItem: { fontFamily: fonts.medium, fontSize: 12, color: colors.accent },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
