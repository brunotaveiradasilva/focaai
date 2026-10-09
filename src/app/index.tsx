import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LogoBadge, Wordmark } from '@/components/logo';
import { Button, Screen } from '@/components/ui';
import { useApp } from '@/store/app';
import { colors, fonts } from '@/theme/tokens';

// Tela 1 — Boas-vindas
export default function Welcome() {
  const profile = useApp((s) => s.profile);
  const routineSkipped = useApp((s) => s.routineSkipped);
  if (profile) return <Redirect href={profile.routine || routineSkipped ? '/hoje' : '/semana'} />;

  return (
    <Screen
      scroll={false}
      contentStyle={styles.center}
      footer={
        <View style={{ flex: 1, gap: 10 }}>
          <Button label="Começar minha preparação" onPress={() => router.push('/onboarding')} />
          <Button
            label="Já tenho uma conta"
            variant="ghost"
            style={{ flexGrow: 1 }}
            onPress={() => router.push('/onboarding')}
          />
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
  tagline: { fontFamily: fonts.body, fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 24 },
  loop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 },
  loopItem: { fontFamily: fonts.medium, fontSize: 12, color: colors.accent },
});
