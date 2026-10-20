// A student's profile on the network, laid out like X's: cover, photo over it, name, bio, join
// date, counts and tabs. The student's own profile (/perfil) adds "Editar perfil", the settings and
// the Evolução tab; anyone else's has the friendship button.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Evolution } from '@/components/evolution';
import { LogoSpinner } from '@/components/logo';
import { Avatar, FriendButton, PostCard } from '@/components/social';
import { Button, Card, Loading, PressableScale, Screen } from '@/components/ui';
import { usePublicProfile, useUserPosts } from '@/lib/queries';
import { colors, fonts } from '@/theme/tokens';

export type ProfileTab = 'posts' | 'evolucao';

export function ProfileView({ userId, initialTab = 'posts' }: { userId: string; initialTab?: ProfileTab }) {
  const profile = usePublicProfile(userId);
  const data = profile.data;
  const self = data?.friendship === 'self';
  const canSee = self || data?.friendship === 'friends';
  const posts = useUserPosts(userId, !!data && canSee);
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  if (!data) return <Loading error={profile.isError} onRetry={() => profile.refetch()} />;

  const list = posts.data?.pages.flatMap((p) => p.posts) ?? [];
  const shownTab = self ? tab : 'posts';
  const joined = new Date(data.joinedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Screen>
      <View style={styles.top}>
        <PressableScale scaleTo={0.85} onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.round}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.topName} numberOfLines={1}>
            {data.user.name}
          </Text>
          <Text style={styles.muted}>{data.posts === 1 ? '1 post' : `${data.posts} posts`}</Text>
        </View>
        {self ? (
          <>
            <PressableScale scaleTo={0.85} onPress={() => router.push('/amigos')} accessibilityLabel="Amigos" style={styles.round}>
              <Ionicons name="people-outline" size={19} color={colors.text} />
            </PressableScale>
            <PressableScale scaleTo={0.85} onPress={() => router.push('/ajustes')} accessibilityLabel="Ajustes" style={styles.round}>
              <Ionicons name="settings-outline" size={19} color={colors.text} />
            </PressableScale>
          </>
        ) : null}
      </View>

      <View style={styles.cover} />
      <View style={styles.avatarRow}>
        <View style={styles.avatarRing}>
          <Avatar member={data.user} size={84} />
        </View>
        {self ? (
          <PressableScale scaleTo={0.95} onPress={() => router.push('/editar-perfil')} style={styles.editBtn}>
            <Text style={styles.editText}>Editar perfil</Text>
          </PressableScale>
        ) : (
          <View style={styles.friendSlot}>
            <FriendButton user={data.user} friendship={data.friendship} />
          </View>
        )}
      </View>

      <Text style={styles.name}>{data.user.name}</Text>
      {data.bio ? <Text style={styles.bio}>{data.bio}</Text> : null}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.muted} />
        <Text style={styles.muted}>Entrou em {joined}</Text>
      </View>
      <View style={styles.counts}>
        <PressableScale scaleTo={0.97} disabled={!self} onPress={() => router.push('/amigos')}>
          <Text style={styles.muted}>
            <Text style={styles.countValue}>{data.friends}</Text> {data.friends === 1 ? 'amigo' : 'amigos'}
          </Text>
        </PressableScale>
        <Text style={styles.muted}>
          <Text style={styles.countValue}>{data.posts}</Text> {data.posts === 1 ? 'post' : 'posts'}
        </Text>
      </View>

      <View style={styles.tabs}>
        <TabButton label="Posts" active={shownTab === 'posts'} onPress={() => setTab('posts')} />
        {self ? <TabButton label="Evolução" active={shownTab === 'evolucao'} onPress={() => setTab('evolucao')} /> : null}
      </View>

      {shownTab === 'evolucao' ? (
        <Evolution />
      ) : canSee ? (
        <>
          {posts.isPending ? <LogoSpinner style={{ marginTop: 16 }} /> : null}
          {posts.isError ? <Text style={styles.empty}>Não deu para carregar os posts. Confira sua internet.</Text> : null}
          {posts.isSuccess && list.length === 0 ? (
            <Text style={styles.empty}>
              {self ? 'Você ainda não publicou nada. Publique pelo feed, na aba Pessoas.' : `${data.user.name} ainda não publicou nada.`}
            </Text>
          ) : null}
          {list.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.hasNextPage ? (
            <Button label={posts.isFetchingNextPage ? 'Carregando…' : 'Ver mais posts'} variant="ghost" style={{ flexGrow: 1 }} onPress={() => posts.fetchNextPage()} />
          ) : null}
        </>
      ) : (
        <Card style={styles.locked}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
          <Text style={styles.lockedText}>
            Só os amigos de {data.user.name} veem os posts. {data.friendship === 'sent' ? 'Seu pedido já foi enviado.' : 'Adicione para acompanhar.'}
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.97} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.tab}>
      <Text style={[styles.tabText, active && { color: colors.text }]}>{label}</Text>
      <View style={[styles.tabLine, active && { backgroundColor: colors.accent }]} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  topName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  // Edge to edge: cancels the screen's side padding.
  cover: { height: 110, marginHorizontal: -16, backgroundColor: colors.accentDim },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -42, gap: 12 },
  avatarRing: { borderRadius: 50, borderWidth: 4, borderColor: colors.ink, backgroundColor: colors.ink },
  editBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 4 },
  editText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  friendSlot: { flexDirection: 'row', maxWidth: 230, flexShrink: 1, marginBottom: 4 },
  name: { color: colors.text, fontFamily: fonts.title, fontSize: 22, marginTop: 10 },
  bio: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  counts: { flexDirection: 'row', gap: 18, marginTop: 8 },
  countValue: { color: colors.text, fontFamily: fonts.semibold },
  tabs: { flexDirection: 'row', marginTop: 16, marginBottom: 14, marginHorizontal: -16, borderBottomWidth: 1, borderColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10 },
  tabText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 14, marginBottom: 10 },
  tabLine: { height: 3, width: 56, borderRadius: 2, backgroundColor: 'transparent' },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginVertical: 16 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockedText: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
});
