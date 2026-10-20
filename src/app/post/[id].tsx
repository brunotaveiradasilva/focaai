import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Avatar, PostCard, errorMessage, openProfile } from '@/components/social';
import { Button, Kicker, Loading, PressableScale, Screen } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useComment, useDeleteComment, usePost } from '@/lib/queries';
import type { Comment } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

const MAX_COMMENT = 500;

// Um post com os comentários
export default function PostScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const open = usePost(id);
  const comment = useComment(id);
  const deleteComment = useDeleteComment(id);
  const [text, setText] = useState('');
  const [toDelete, setToDelete] = useState<Comment | null>(null);
  if (!open.data) return <Loading error={open.isError} onRetry={() => open.refetch()} />;

  const ready = text.trim().length > 0 && !comment.isPending;
  const send = () => ready && comment.mutate(text, { onSuccess: () => setText('') });

  return (
    // The comment box sits under the list and rises with the keyboard.
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.ink }}>
      <Screen
        footer={
          <View style={{ flex: 1, gap: 6 }}>
            {comment.isError ? <Text style={styles.error}>{errorMessage(comment.error)}</Text> : null}
            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Escreva um comentário"
                placeholderTextColor={colors.muted}
                maxLength={MAX_COMMENT}
                multiline
                style={styles.input}
              />
              <PressableScale scaleTo={0.88} disabled={!ready} onPress={send} accessibilityLabel="Enviar comentário" style={[styles.send, !ready && { opacity: 0.4 }]}>
                {comment.isPending ? <ActivityIndicator size="small" color={colors.accentText} /> : <Ionicons name="send" size={16} color={colors.accentText} />}
              </PressableScale>
            </View>
          </View>
        }>
        <View style={styles.top}>
          <PressableScale scaleTo={0.85} onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </PressableScale>
          <Kicker style={{ marginBottom: 0 }}>Post</Kicker>
        </View>

        <PostCard post={open.data.post} open={false} />

        <Text style={styles.section}>
          {open.data.comments.length === 0 ? 'Nenhum comentário ainda' : open.data.comments.length === 1 ? '1 comentário' : `${open.data.comments.length} comentários`}
        </Text>
        {open.data.comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <PressableScale scaleTo={0.9} onPress={() => openProfile(c.author.id)} accessibilityLabel={`Perfil de ${c.author.name}`}>
              <Avatar member={c.author} size={32} />
            </PressableScale>
            <View style={styles.bubble}>
              <View style={styles.bubbleHead}>
                <Text style={styles.name} numberOfLines={1}>
                  {c.author.name}
                </Text>
                <Text style={styles.meta}>{timeAgo(c.createdAt)}</Text>
                {c.canDelete ? (
                  <PressableScale scaleTo={0.85} onPress={() => setToDelete(c)} accessibilityLabel="Apagar comentário" style={styles.trash}>
                    <Ionicons name="trash-outline" size={14} color={colors.muted} />
                  </PressableScale>
                ) : null}
              </View>
              <Text style={styles.text}>{c.text}</Text>
            </View>
          </View>
        ))}
      </Screen>

      <Sheet visible={!!toDelete} onClose={() => setToDelete(null)}>
        <Text style={styles.sheetTitle}>Apagar comentário?</Text>
        <Text style={styles.meta}>Não dá para desfazer.</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          <Button
            label="Apagar"
            onPress={() => {
              if (toDelete) deleteComment.mutate(toDelete.id);
              setToDelete(null);
            }}
          />
          <Button label="Cancelar" variant="ghost" style={{ flexGrow: 1 }} onPress={() => setToDelete(null)} />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  section: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13, marginTop: 4, marginBottom: 10 },
  comment: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bubble: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, gap: 2 },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  trash: { marginLeft: 'auto', padding: 4 },
  text: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 12 },
  sheetTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 20, marginBottom: 8 },
});
