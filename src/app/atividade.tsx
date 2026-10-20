import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, FriendButton, openProfile } from '@/components/social';
import { Card, Kicker, Loading, PressableScale, Screen, Title } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useActivity, useMarkActivityRead } from '@/lib/queries';
import type { ActivityItem } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

// Atividade: pedidos e aceites de amizade, comentários, posts dos amigos e o lembrete de simulado
export default function Atividade() {
  const activity = useActivity();
  const markRead = useMarkActivityRead();
  const unread = activity.data?.unread ?? 0;
  const { mutate } = markRead;

  // Opening the screen reads everything; the list keeps marking what was new until leaving.
  useEffect(() => {
    if (unread > 0) mutate();
  }, [unread, mutate]);

  if (!activity.data) return <Loading error={activity.isError} onRetry={() => activity.refetch()} />;

  const fresh = activity.data.items.filter((i) => !i.read);
  const older = activity.data.items.filter((i) => i.read);

  return (
    <Screen>
      <View style={styles.top}>
        <PressableScale scaleTo={0.85} onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <Kicker style={{ marginBottom: 0 }}>Atividade</Kicker>
      </View>
      <Title>Notificações</Title>

      {activity.data.items.length === 0 ? (
        <Card style={styles.empty}>
          <Ionicons name="notifications-outline" size={26} color={colors.muted} />
          <Text style={styles.emptyText}>
            Aqui aparecem pedidos de amizade, comentários nos seus posts, o que seus amigos publicam e lembretes de estudo.
          </Text>
        </Card>
      ) : null}

      {fresh.length ? <Text style={styles.section}>Novas</Text> : null}
      {fresh.map((item) => (
        <Row key={item.id} item={item} fresh />
      ))}
      {older.length ? <Text style={styles.section}>Anteriores</Text> : null}
      {older.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </Screen>
  );
}

const quote = (s?: string) => (s ? `: “${s}”` : '');

/** What happened, in words, and where tapping takes the student. */
function describe(item: ActivityItem): { text: string; open: () => void } {
  const actor = item.actor;
  const toPost = () => item.postId && router.push({ pathname: '/post/[id]', params: { id: item.postId } });
  switch (item.type) {
    case 'friend_request':
      return { text: 'pediu sua amizade', open: () => actor && openProfile(actor.id) };
    case 'friend_accepted':
      return { text: 'aceitou seu pedido de amizade', open: () => actor && openProfile(actor.id) };
    case 'comment':
      return { text: `comentou no seu post${quote(item.excerpt)}`, open: toPost };
    case 'post':
      return { text: item.excerpt ? `publicou${quote(item.excerpt)}` : 'publicou uma foto', open: toPost };
    case 'simulado_reminder':
      return { text: 'Faz uma semana sem simulado. Que tal fazer um agora? Dá para começar com poucas questões.', open: () => router.push('/questoes') };
  }
}

function Row({ item, fresh }: { item: ActivityItem; fresh?: boolean }) {
  const { text, open } = describe(item);
  const actor = item.actor;
  return (
    <PressableScale scaleTo={0.98} onPress={open} style={[styles.row, fresh && styles.rowFresh]}>
      {actor ? (
        <Avatar member={actor} size={44} />
      ) : (
        <View style={styles.icon}>
          <Ionicons name="document-text" size={20} color={colors.accent} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.text} numberOfLines={3}>
          {actor ? <Text style={styles.name}>{actor.name} </Text> : null}
          {text}
          <Text style={styles.time}> · {timeAgo(item.createdAt)}</Text>
        </Text>
      </View>
      {item.type === 'friend_request' && actor ? <FriendButton user={actor} friendship="received" compact /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  section: { color: colors.text, fontFamily: fonts.title, fontSize: 18, marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12 },
  rowFresh: { backgroundColor: colors.accentSoft },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  name: { fontFamily: fonts.semibold },
  time: { color: colors.muted },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  emptyText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
