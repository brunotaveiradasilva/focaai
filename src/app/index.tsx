import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GoogleButton } from '@/components/google-button';
import { LogoBadge, Wordmark } from '@/components/logo';
import { Button, Screen } from '@/components/ui';
import { devSignInEnabled } from '@/lib/api';
import { useStudentState } from '@/lib/queries';
import { useApp } from '@/store/app';
import { useSession } from '@/store/session';
import { colors, fonts } from '@/theme/tokens';

// Tela 1 — Boas-vindas e login com Google
export default function Welcome() {
  const status = useSession((s) => s.status);
  const signIn = useSession((s) => s.signIn);
  const signInDev = useSession((s) => s.signInDev);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'signedIn') return <AfterSignIn />;

  const enter = async (signInWith: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await signInWith();
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
            <GoogleButton
              onIdToken={(idToken) => enter(() => signIn(idToken))}
              onError={() => setError('O login com Google não foi concluído.')}
            />
          )}
          {devSignInEnabled && !busy ? (
            <Button label="Entrar como aluno de teste (API local)" variant="ghost" style={{ alignSelf: 'stretch' }} onPress={() => enter(signInDev)} />
          ) : null}
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

// Signed in: the account's state decides between the onboarding and the app. The first time on a
// device that already had the app, this is also when its old data is brought into the account.
function AfterSignIn() {
  const state = useStudentState();
  const routineSkipped = useApp((s) => s.routineSkipped);
  const signOut = useSession((s) => s.signOut);

  if (state.data) {
    const profile = state.data.profile;
    if (!profile) return <Redirect href="/onboarding" />;
    return <Redirect href={profile.routine || routineSkipped ? '/hoje' : '/semana'} />;
  }
  return (
    <Screen scroll={false} contentStyle={styles.center}>
      {state.isError ? (
        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          <Text style={styles.tagline}>Não deu para carregar seus dados. Confira sua internet.</Text>
          <Button label="Tentar de novo" onPress={() => state.refetch()} />
          <Button label="Sair da conta" variant="ghost" onPress={() => signOut()} />
        </View>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
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
