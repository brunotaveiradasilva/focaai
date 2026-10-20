import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, errorMessage } from '@/components/social';
import { Loading, PressableScale, Screen } from '@/components/ui';
import { PickedImage, pickImage } from '@/lib/images';
import { useEditProfile, usePublicProfile } from '@/lib/queries';
import type { PublicProfile } from '@/lib/types';
import { useSession } from '@/store/session';
import { colors, fonts } from '@/theme/tokens';

const MAX_NAME = 50;
const MAX_BIO = 160;

// Editar perfil: nome, bio e foto
export default function EditarPerfil() {
  const userId = useSession((s) => s.user!.id);
  const profile = usePublicProfile(userId);
  if (!profile.data) return <Loading error={profile.isError} onRetry={() => profile.refetch()} />;
  // Mounted once the profile is in, so the fields start with what's saved.
  return <Editor profile={profile.data} />;
}

function Editor({ profile }: { profile: PublicProfile }) {
  const updateUser = useSession((s) => s.updateUser);
  const editProfile = useEditProfile();
  const [name, setName] = useState(profile.user.name);
  const [bio, setBio] = useState(profile.bio ?? '');
  // The photo saved now (null once removed) and a new one picked, if any.
  const [picture, setPicture] = useState<string | null>(profile.user.picture ?? null);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [picking, setPicking] = useState(false);
  const ready = name.trim().length > 0 && !editProfile.isPending;

  const choosePhoto = async () => {
    setPicking(true);
    try {
      const picked = await pickImage({ maxWidth: 512, square: true });
      if (picked) setPhoto(picked);
    } finally {
      setPicking(false);
    }
  };

  const save = () =>
    editProfile.mutate(
      { name: name.trim(), bio, picture, photo: photo ?? undefined },
      {
        onSuccess: async (saved) => {
          await updateUser({ name: saved.user.name, picture: saved.user.picture ?? null });
          router.back();
        },
      },
    );

  const hasPhoto = !!photo || !!picture;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.ink }}>
      <Screen>
        <View style={styles.top}>
          <PressableScale scaleTo={0.95} onPress={() => router.back()} style={styles.topSide}>
            <Text style={styles.cancel}>Cancelar</Text>
          </PressableScale>
          <Text style={styles.topTitle}>Editar perfil</Text>
          <View style={[styles.topSide, { alignItems: 'flex-end' }]}>
            <PressableScale scaleTo={0.94} disabled={!ready} onPress={save} style={[styles.save, !ready && { opacity: 0.4 }]}>
              {editProfile.isPending ? <ActivityIndicator size="small" color={colors.accentText} /> : <Text style={styles.saveText}>Salvar</Text>}
            </PressableScale>
          </View>
        </View>

        <View style={styles.cover} />
        <View style={styles.avatarRow}>
          <PressableScale scaleTo={0.95} disabled={picking} onPress={choosePhoto} accessibilityLabel="Trocar foto" style={styles.avatarRing}>
            {photo ? (
              <Image source={photo.uri} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors />
            ) : (
              <Avatar member={{ name: name || profile.user.name, picture: picture ?? undefined }} size={84} />
            )}
            <View style={styles.camera}>
              {picking ? <ActivityIndicator color={colors.text} /> : <Ionicons name="camera-outline" size={24} color={colors.text} />}
            </View>
          </PressableScale>
          {hasPhoto ? (
            <PressableScale
              scaleTo={0.95}
              onPress={() => {
                setPhoto(null);
                setPicture(null);
              }}
              style={styles.removeBtn}>
              <Text style={styles.removeText}>Remover foto</Text>
            </PressableScale>
          ) : null}
        </View>

        <Field label="Nome" value={name} onChangeText={setName} max={MAX_NAME} />
        <Field label="Bio" value={bio} onChangeText={setBio} max={MAX_BIO} multiline placeholder="Curso dos sonhos, cidade, o que está estudando…" />
        {editProfile.isError ? <Text style={styles.error}>{errorMessage(editProfile.error)}</Text> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  max,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  max: number;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldCount}>
          {value.length}/{max}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        maxLength={max}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  topSide: { width: 90 },
  cancel: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  save: { backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16, minWidth: 74, alignItems: 'center' },
  saveText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 13 },
  cover: { height: 110, marginHorizontal: -16, backgroundColor: colors.accentDim },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -42, marginBottom: 18 },
  avatarRing: { borderRadius: 50, borderWidth: 4, borderColor: colors.ink, backgroundColor: colors.ink },
  photo: { width: 84, height: 84, borderRadius: 42 },
  camera: {
    ...StyleSheet.absoluteFill,
    borderRadius: 42,
    backgroundColor: 'rgba(5,8,13,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: { paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4 },
  removeText: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13 },
  field: { borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 10 },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  fieldCount: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  input: { color: colors.text, fontFamily: fonts.body, fontSize: 15, paddingVertical: 6, paddingHorizontal: 0 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13, marginTop: 12 },
});
