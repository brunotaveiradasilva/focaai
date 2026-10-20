// A student's profile on the network: photo, bio, counts, friendship and posts. The same screen
// serves the student's own profile (/perfil), with the bio editor, the composer and the settings.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Avatar, Composer, FriendButton, PostCard, errorMessage } from '@/components/social';
import { Button, Card, Kicker, Loading, PressableScale, Screen } from '@/components/ui';
import { usePublicProfile, useSetBio, useUserPosts } from '@/lib/queries';
import { colors, fonts } from '@/theme/tokens';

const MAX_BIO = 160;

export function ProfileView({ userId }: { userId: string }) {
  const profile = usePublicProfile(userId);
  const data = profile.data;
  const self = data?.friendship === 'self';
  const canSee = self || data?.friendship === 'friends';
  const posts = useUserPosts(userId, !!data && canSee);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const setBio = useSetBio();
  if (!data) return <Loading error={profile.isError} onRetry={() => profile.refetch()} />;

  const list = posts.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <Screen>
      <View style={styles.top}>
        <PressableScale scaleTo={0.85} onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.round}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <Kicker style={{ marginBottom: 0, flex: 1 }}>Perfil</Kicker>
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

      <View style={styles.head}>
        <Avatar member={data.user} size={76} />
        <Text style={styles.name}>{data.user.name}</Text>
        {data.bio ? (
          <Text style={styles.bio}>{data.bio}</Text>
        ) : self ? (
          <Text style={[styles.bio, { color: colors.muted }]}>Conte um pouco sobre você: curso dos sonhos, cidade, o que está estudando.</Text>
        ) : null}
        <View style={styles.counts}>
          <PressableScale scaleTo={0.95} disabled={!self} onPress={() => router.push('/amigos')} style={styles.count}>
            <Text style={styles.countValue}>{data.friends}</Text>
            <Text style={styles.countLabel}>{data.friends === 1 ? 'amigo' : 'amigos'}</Text>
          </PressableScale>
          <View style={styles.count}>
            <Text style={styles.countValue}>{data.posts}</Text>
            <Text style={styles.countLabel}>{data.posts === 1 ? 'post' : 'posts'}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {self ? (
            <Button label="Editar bio" variant="ghost" style={{ flexGrow: 1 }} onPress={() => setBioDraft(data.bio ?? '')} />
          ) : (
            <FriendButton user={data.user} friendship={data.friendship} />
          )}
        </View>
      </View>

      {canSee ? (
        <>
          {self ? <Composer /> : null}
          {posts.isPending ? <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} /> : null}
          {posts.isError ? <Text style={styles.empty}>Não deu para carregar os posts. Confira sua internet.</Text> : null}
          {posts.isSuccess && list.length === 0 ? (
            <Text style={styles.empty}>{self ? 'Você ainda não publicou nada.' : `${data.user.name} ainda não publicou nada.`}</Text>
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

      <Sheet visible={bioDraft !== null} onClose={() => setBioDraft(null)}>
        <Text style={styles.sheetTitle}>Sua bio</Text>
        <TextInput
          value={bioDraft ?? ''}
          onChangeText={setBioDraft}
          placeholder="Ex.: Quero Medicina na UFMS. Estudo de noite."
          placeholderTextColor={colors.muted}
          maxLength={MAX_BIO}
          multiline
          style={styles.input}
        />
        <Text style={styles.hint}>
          {(bioDraft ?? '').length}/{MAX_BIO}
        </Text>
        {setBio.isError ? <Text style={styles.error}>{errorMessage(setBio.error)}</Text> : null}
        <View style={{ gap: 10, marginTop: 12 }}>
          <Button label="Salvar" disabled={setBio.isPending} onPress={() => setBio.mutate(bioDraft ?? '', { onSuccess: () => setBioDraft(null) })} />
          <Button label="Cancelar" variant="ghost" style={{ flexGrow: 1 }} onPress={() => setBioDraft(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  head: { alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 18 },
  name: { color: colors.text, fontFamily: fonts.title, fontSize: 24, marginTop: 6, textAlign: 'center' },
  bio: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 360 },
  counts: { flexDirection: 'row', gap: 28, marginTop: 8 },
  count: { alignItems: 'center' },
  countValue: { color: colors.text, fontFamily: fonts.title, fontSize: 20 },
  countLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  actions: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 12 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginVertical: 16 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockedText: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  sheetTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 20, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: 'right', marginTop: 6 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
});
