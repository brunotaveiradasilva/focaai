// Offers to post an achievement (a roadmap topic done, a simulado finished) to the feed. The text
// comes ready and can be edited; skipping is one tap. Mounted once, in the root layout.
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Sheet, useOpenSheets } from '@/components/sheet';
import { MAX_POST, errorMessage } from '@/components/social';
import { Button, PressableScale } from '@/components/ui';
import { useCreatePost } from '@/lib/queries';
import { ShareDraft, useShare } from '@/store/share';
import { colors, fonts } from '@/theme/tokens';

export function ShareProgressSheet() {
  const draft = useShare((s) => s.draft);
  const close = useShare((s) => s.close);
  // Waits for any other sheet (the topic, the check-in) to close, plus a beat: iOS can't present a
  // modal while another is still going away, and on the web the tap that closed it would land here.
  const othersOpen = useOpenSheets((s) => s.count > 0);
  const [settled, setSettled] = useState<ShareDraft | null>(null);
  useEffect(() => {
    if (!draft || othersOpen) return;
    const id = setTimeout(() => setSettled(draft), 450);
    return () => clearTimeout(id);
  }, [draft, othersOpen]);
  return (
    <Sheet visible={!!draft && !othersOpen && settled === draft} onClose={close} counted={false}>
      {/* Keyed by the offer, so each one starts from its own text. */}
      {draft ? <ShareBody key={draft.text} draft={draft} onDone={close} /> : null}
    </Sheet>
  );
}

function ShareBody({ draft, onDone }: { draft: ShareDraft; onDone: () => void }) {
  const createPost = useCreatePost();
  const [text, setText] = useState(draft.text);
  const ready = text.trim().length > 0 && !createPost.isPending;

  return (
    <>
      <Text style={styles.title}>{draft.title}</Text>
      <Text style={styles.sub}>Quer compartilhar no feed? Só seus amigos veem.</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={MAX_POST}
        style={styles.input}
        accessibilityLabel="Texto do post"
      />
      {createPost.isError ? <Text style={styles.error}>{errorMessage(createPost.error)}</Text> : null}
      <View style={{ gap: 10, marginTop: 14 }}>
        <PressableScale
          scaleTo={0.96}
          disabled={!ready}
          onPress={() => createPost.mutate({ text }, { onSuccess: onDone })}
          style={[styles.publish, !ready && { opacity: 0.4 }]}>
          {createPost.isPending ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.publishText}>Publicar no feed</Text>}
        </PressableScale>
        <Button label="Agora não" variant="ghost" style={{ flexGrow: 1 }} onPress={onDone} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontFamily: fonts.title, fontSize: 20, marginBottom: 4 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  publish: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  publishText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
});
