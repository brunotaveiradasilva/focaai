import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { MemberRow } from '@/components/social';
import { Card, Kicker, Loading, PressableScale, Screen, Title } from '@/components/ui';
import { useFriends, useSearchStudents } from '@/lib/queries';
import type { Friendship, Member } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

// Amigos: buscar alunos, responder pedidos e ver quem já é amigo
export default function Amigos() {
  const friends = useFriends();
  const [query, setQuery] = useState('');
  const searching = query.trim().length >= 2;
  const results = useSearchStudents(query);
  if (!friends.data) return <Loading error={friends.isError} onRetry={() => friends.refetch()} />;

  const { received, sent } = friends.data;

  return (
    <Screen>
      <View style={styles.top}>
        <PressableScale scaleTo={0.85} onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <Kicker style={{ marginBottom: 0 }}>Amigos</Kicker>
      </View>
      <Title>Sua turma de estudo</Title>

      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar alunos pelo nome"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <PressableScale scaleTo={0.85} onPress={() => setQuery('')} accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </PressableScale>
        ) : null}
      </View>

      {searching ? (
        <Section title="Resultados">
          {!results.data ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 8 }} /> : null}
          {results.data?.length === 0 ? <Text style={styles.empty}>Ninguém com esse nome.</Text> : null}
          {results.data?.map((r) => <MemberRow key={r.user.id} user={r.user} friendship={r.friendship} />)}
        </Section>
      ) : (
        <>
          {received.length ? <List title="Pedidos de amizade" members={received} friendship="received" /> : null}
          <List
            title="Amigos"
            members={friends.data.friends}
            friendship="friends"
            empty="Você ainda não tem amigos aqui. Busque colegas pelo nome para adicionar."
          />
          {sent.length ? <List title="Pedidos enviados" members={sent} friendship="sent" /> : null}
        </>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      <Card style={{ paddingVertical: 6 }}>{children}</Card>
    </>
  );
}

function List({ title, members, friendship, empty }: { title: string; members: Member[]; friendship: Friendship; empty?: string }) {
  return (
    <Section title={members.length ? `${title} · ${members.length}` : title}>
      {members.length === 0 && empty ? <Text style={styles.empty}>{empty}</Text> : null}
      {members.map((m) => (
        <MemberRow key={m.id} user={m} friendship={friendship} />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 14, paddingVertical: 12 },
  section: { color: colors.text, fontFamily: fonts.title, fontSize: 18, marginTop: 18, marginBottom: 10 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingVertical: 8 },
});
