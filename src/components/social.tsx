// Pieces shared by the network screens: avatar, post card, composer and the friendship button.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button, Card, PressableScale } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useCreatePost, useDeletePost, useFriendship } from '@/lib/queries';
import type { Friendship, Member, Post } from '@/lib/types';
import { useSession } from '@/store/session';
import { colors, fonts } from '@/theme/tokens';

export const MAX_POST = 2000;

/** The student's own profile lives at /perfil; everyone else's at /usuario/[id]. */
export function openProfile(userId: string) {
  if (userId === useSession.getState().user?.id) router.push('/perfil');
  else router.push({ pathname: '/usuario/[id]', params: { id: userId } });
}

export function Avatar({ member, size = 40 }: { member: Pick<Member, 'name' | 'picture'>; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (member.picture) return <Image source={member.picture} style={[box, styles.avatarBg]} contentFit="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[box, styles.avatarBg, styles.avatarCenter]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{member.name[0]?.toUpperCase()}</Text>
    </View>
  );
}

export function PostCard({ post, open = true }: { post: Post; open?: boolean }) {
  const deletePost = useDeletePost();
  const [confirm, setConfirm] = useState(false);
  return (
    <Card onPress={open ? () => router.push({ pathname: '/post/[id]', params: { id: post.id } }) : undefined} style={{ gap: 10 }}>
      <View style={styles.postHead}>
        <PressableScale scaleTo={0.95} onPress={() => openProfile(post.author.id)} style={styles.author} accessibilityLabel={`Perfil de ${post.author.name}`}>
          <Avatar member={post.author} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {post.author.name}
            </Text>
            <Text style={styles.meta}>{timeAgo(post.createdAt)}</Text>
          </View>
        </PressableScale>
        {post.mine ? (
          <PressableScale scaleTo={0.85} onPress={() => setConfirm(true)} accessibilityLabel="Apagar post" style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.muted} />
          </PressableScale>
        ) : null}
      </View>
      <Text style={styles.postText}>{post.text}</Text>
      {open ? (
        <View style={styles.postFoot}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.muted} />
          <Text style={styles.meta}>
            {post.comments === 0 ? 'Comentar' : post.comments === 1 ? '1 comentário' : `${post.comments} comentários`}
          </Text>
        </View>
      ) : null}

      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Text style={styles.sheetTitle}>Apagar este post?</Text>
        <Text style={styles.meta}>Os comentários dele também somem. Não dá para desfazer.</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          <Button
            label="Apagar post"
            onPress={() => {
              setConfirm(false);
              deletePost.mutate(post.id, { onSuccess: () => (open ? undefined : router.back()) });
            }}
          />
          <Button label="Cancelar" variant="ghost" style={{ flexGrow: 1 }} onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Card>
  );
}

/** Box to write a post, at the top of the feed and of the student's own profile. */
export function Composer() {
  const [text, setText] = useState('');
  const createPost = useCreatePost();
  const ready = text.trim().length > 0 && !createPost.isPending;
  return (
    <Card style={{ gap: 10 }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Compartilhe como foi o estudo, uma dúvida, uma conquista…"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={MAX_POST}
        style={styles.composer}
      />
      {createPost.isError ? <Text style={styles.error}>{errorMessage(createPost.error)}</Text> : null}
      <View style={styles.composerFoot}>
        <Text style={styles.meta}>{text.length > MAX_POST - 200 ? `${MAX_POST - text.length} restantes` : ''}</Text>
        <PressableScale
          scaleTo={0.94}
          disabled={!ready}
          onPress={() => createPost.mutate(text, { onSuccess: () => setText('') })}
          style={[styles.publish, !ready && { opacity: 0.4 }]}>
          {createPost.isPending ? <ActivityIndicator size="small" color={colors.accentText} /> : <Text style={styles.publishText}>Publicar</Text>}
        </PressableScale>
      </View>
    </Card>
  );
}

// `short`: the label on a list row, where only adding and accepting carry text.
const FRIEND_LABEL: Record<
  Exclude<Friendship, 'self' | null> | 'none',
  { label: string; short?: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  none: { label: 'Adicionar amigo', short: 'Adicionar', icon: 'person-add' },
  sent: { label: 'Pedido enviado', icon: 'hourglass-outline' },
  received: { label: 'Aceitar pedido', short: 'Aceitar', icon: 'checkmark' },
  friends: { label: 'Amigos', icon: 'people' },
};

/**
 * Add, accept, cancel or unfriend. Undoing something (cancel, decline, unfriend) asks first;
 * `compact` fits it on a list row.
 */
export function FriendButton({ user, friendship, compact }: { user: Member; friendship: Friendship; compact?: boolean }) {
  const friendshipMutation = useFriendship();
  const [confirm, setConfirm] = useState(false);
  if (friendship === 'self') return null;
  const state = friendship ?? 'none';
  const { label, short, icon } = FRIEND_LABEL[state];
  const text = compact ? short : label;
  const filled = state === 'none' || state === 'received';
  const busy = friendshipMutation.isPending;
  const act = (action: 'add' | 'remove') => friendshipMutation.mutate({ userId: user.id, action });

  return (
    <View style={[styles.friendRow, compact && { flexGrow: 0 }]}>
      <PressableScale
        scaleTo={0.95}
        disabled={busy}
        onPress={() => (filled ? act('add') : setConfirm(true))}
        style={[styles.friendBtn, filled ? styles.friendFilled : styles.friendOutline, compact && styles.friendCompact]}>
        {busy ? (
          <ActivityIndicator size="small" color={filled ? colors.accentText : colors.muted} />
        ) : (
          <>
            <Ionicons name={icon} size={15} color={filled ? colors.accentText : colors.text} />
            {text ? <Text style={[styles.friendText, { color: filled ? colors.accentText : colors.text }]}>{text}</Text> : null}
          </>
        )}
      </PressableScale>
      {state === 'received' ? (
        <PressableScale scaleTo={0.95} disabled={busy} onPress={() => act('remove')} style={[styles.friendBtn, styles.friendOutline, compact && styles.friendCompact]}>
          <Ionicons name="close" size={15} color={colors.text} />
          {compact ? null : <Text style={styles.friendText}>Recusar</Text>}
        </PressableScale>
      ) : null}

      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Text style={styles.sheetTitle}>{state === 'friends' ? `Desfazer amizade com ${user.name}?` : 'Cancelar o pedido de amizade?'}</Text>
        <Text style={styles.meta}>
          {state === 'friends'
            ? 'Vocês deixam de ver os posts um do outro. Dá para pedir amizade de novo depois.'
            : `${user.name} ainda não respondeu. O pedido some para os dois.`}
        </Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          <Button
            label={state === 'friends' ? 'Desfazer amizade' : 'Cancelar pedido'}
            onPress={() => {
              setConfirm(false);
              act('remove');
            }}
          />
          <Button label="Voltar" variant="ghost" style={{ flexGrow: 1 }} onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </View>
  );
}

/** A member on a list (friends, requests, search), with the friendship button on the right. */
export function MemberRow({ user, friendship }: { user: Member; friendship: Friendship }) {
  return (
    <View style={styles.memberRow}>
      <PressableScale scaleTo={0.97} onPress={() => openProfile(user.id)} style={styles.author}>
        <Avatar member={user} size={40} />
        <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>
          {user.name}
        </Text>
      </PressableScale>
      <FriendButton user={user} friendship={friendship} compact />
    </View>
  );
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não deu para enviar. Confira sua internet e tente de novo.';
}

const styles = StyleSheet.create({
  avatarBg: { backgroundColor: colors.purple },
  avatarCenter: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontFamily: fonts.bold },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  name: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  postText: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  postFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  composer: {
    minHeight: 64,
    maxHeight: 200,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    padding: 0,
  },
  composerFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  publish: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, minWidth: 92, alignItems: 'center' },
  publishText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 13 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 12 },
  friendRow: { flexDirection: 'row', gap: 8, flexGrow: 1 },
  friendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  friendFilled: { backgroundColor: colors.accent, flexGrow: 1 },
  friendOutline: { borderWidth: 1, borderColor: colors.line, flexGrow: 1 },
  friendCompact: { flexGrow: 0, paddingVertical: 7, paddingHorizontal: 10 },
  friendText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  sheetTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 20, marginBottom: 8 },
});
