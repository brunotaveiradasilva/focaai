import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LogoSpinner } from '@/components/logo';
import { Avatar, Composer, PostCard } from '@/components/social';
import { SUBJECT_ICON } from '@/components/subject-style';
import { Button, Card, Kicker, Pill, PillRow, PressableScale, Screen, Sub, Title } from '@/components/ui';
import { TIERS, TRACK_LABEL, courseById, subjectById } from '@/data/catalog';
import { useConnect, useFeed, useFriends, usePeople, usePlanSummary, useProfile, useStats, useToggleGroup } from '@/lib/queries';
import { useSession } from '@/store/session';
import { enterUp } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const PERIOD = ['manhã', 'tarde', 'noite'];

// Pessoas — o feed dos amigos e a descoberta de quem tem o mesmo objetivo
export default function Pessoas() {
  const [tab, setTab] = useState<'feed' | 'descobrir'>('feed');
  const user = useSession((s) => s.user);
  const requests = useFriends().data?.received.length ?? 0;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Kicker>Pessoas</Kicker>
          <Title>Estude com quem quer o mesmo</Title>
        </View>
        <PressableScale scaleTo={0.85} onPress={() => router.push('/amigos')} accessibilityLabel="Amigos" style={styles.round}>
          <Ionicons name="people-outline" size={19} color={colors.text} />
          {requests ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests}</Text>
            </View>
          ) : null}
        </PressableScale>
        {user ? (
          <PressableScale scaleTo={0.85} onPress={() => router.push('/perfil')} accessibilityLabel="Meu perfil">
            <Avatar member={{ name: user.name ?? user.email, picture: user.picture ?? undefined }} size={38} />
          </PressableScale>
        ) : null}
      </View>
      <PillRow>
        <Pill label="Feed" selected={tab === 'feed'} onPress={() => setTab('feed')} />
        <Pill label="Descobrir" selected={tab === 'descobrir'} onPress={() => setTab('descobrir')} />
      </PillRow>
      {tab === 'feed' ? <Feed /> : <Discover />}
    </Screen>
  );
}

function Feed() {
  const feed = useFeed();
  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? [];
  return (
    <>
      <Composer />
      {feed.isPending ? <LogoSpinner style={{ marginTop: 16 }} /> : null}
      {feed.isError ? <Text style={styles.empty}>Não deu para carregar o feed. Confira sua internet.</Text> : null}
      {feed.isSuccess && posts.length === 0 ? (
        <Card style={{ gap: 10, alignItems: 'center' }}>
          <Ionicons name="chatbubbles-outline" size={26} color={colors.muted} />
          <Text style={[styles.empty, { marginVertical: 0 }]}>
            Aqui aparecem os seus posts e os dos seus amigos. Adicione colegas para acompanhar o estudo deles.
          </Text>
          <Button label="Encontrar amigos" variant="ghost" style={{ alignSelf: 'stretch', flexGrow: 0 }} onPress={() => router.push('/amigos')} />
        </Card>
      ) : null}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {feed.hasNextPage ? (
        <Button label={feed.isFetchingNextPage ? 'Carregando…' : 'Ver mais posts'} variant="ghost" style={{ flexGrow: 1 }} onPress={() => feed.fetchNextPage()} />
      ) : null}
    </>
  );
}

// Sugestões de parceiros e grupos de estudo (ainda sobre perfis de exemplo)
function Discover() {
  const profile = useProfile()!;
  const people = usePeople();
  const goal = usePlanSummary().data?.goalLabel ?? '';
  const myStreak = useStats(7).data?.streak ?? 0;
  const connect = useConnect();
  const toggleGroup = useToggleGroup();
  if (!people.data) {
    return people.isError ? (
      <Button label="Tentar de novo" onPress={() => people.refetch()} />
    ) : (
      <LogoSpinner style={{ marginTop: 16 }} />
    );
  }

  // Matching runs in the API (still over example profiles, see the notice below).
  const { matches, groups } = people.data;
  const course = courseById(profile.courseId);

  return (
    <>
      <Sub>Gente com objetivo, ritmo e horários parecidos com os seus, e quem é forte onde você trava.</Sub>

      <View style={styles.demo}>
        <Ionicons name="information-circle" size={16} color={colors.gold} />
        <Text style={styles.demoText}>
          Versão de demonstração: os perfis abaixo são exemplos fictícios. A rede real chega junto com as contas de usuário.
        </Text>
      </View>

      <Card style={{ gap: 6 }}>
        <Text style={styles.cardKicker}>SEU CARTÃO DE ESTUDO</Text>
        <Text style={styles.cardTitle}>{profile.name}</Text>
        <Text style={styles.muted}>{goal}</Text>
        <View style={styles.chips}>
          <Chip icon="trophy-outline" label={`Concorrência ${TIERS[course.tier].label.toLowerCase()}`} />
          <Chip icon="flame-outline" label={`${myStreak} dias seguidos`} />
        </View>
      </Card>

      <Text style={styles.section}>Sugestões para você</Text>
      {matches.map((m, i) => {
        const state = m.connection;
        const help = m.helpsWith;
        return (
          <Animated.View key={m.person.id} entering={enterUp(Math.min(i, 6) * 40)}>
            <Card style={{ gap: 8 }}>
              <View style={styles.personHead}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.person.name[0]}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle}>
                    {m.person.name} <Text style={styles.example}>· exemplo</Text>
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {courseById(m.person.courseId).name} · {TRACK_LABEL[m.person.track]} {m.person.cycle} · {m.person.city}
                  </Text>
                </View>
                <View style={styles.match}>
                  <Text style={styles.matchValue}>{m.score}%</Text>
                  <Text style={styles.matchLabel}>afinidade</Text>
                </View>
              </View>
              <Text style={styles.bio}>{m.person.bio}</Text>
              <View style={styles.chips}>
                {m.reasons.slice(0, 2).map((r) => (
                  <Chip key={r} icon="checkmark" label={r} />
                ))}
                <Chip icon="time-outline" label={`Estuda de ${m.person.periods.map((p) => PERIOD[p]).join(' e ')}`} />
                {help.map((s) => (
                  <Chip key={s} icon={SUBJECT_ICON[s]} label={`Forte em ${subjectById(s).name}`} highlight />
                ))}
              </View>
              <PressableScale
                scaleTo={0.95}
                disabled={!!state}
                onPress={() => connect.mutate(m.person.id)}
                style={[styles.connect, state && styles.connectDone]}>
                <Ionicons name={state ? 'hourglass-outline' : 'person-add'} size={15} color={state ? colors.muted : colors.accentText} />
                <Text style={[styles.connectText, state && { color: colors.muted }]}>
                  {state ? 'Pedido enviado (demonstração)' : 'Conectar'}
                </Text>
              </PressableScale>
            </Card>
          </Animated.View>
        );
      })}

      <Text style={styles.section}>Grupos de estudo</Text>
      {groups.map((g) => {
        const joined = g.joined;
        return (
          <Card key={g.id} style={styles.group}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardTitle}>{g.name}</Text>
              <Text style={styles.muted}>{g.desc}</Text>
            </View>
            <PressableScale scaleTo={0.92} onPress={() => toggleGroup.mutate({ groupId: g.id, join: !joined })} style={[styles.join, joined && styles.joined]}>
              <Text style={[styles.joinText, joined && { color: colors.accent }]}>{joined ? 'Participando' : 'Entrar'}</Text>
            </PressableScale>
          </Card>
        );
      })}
    </>
  );
}

function Chip({ icon, label, highlight }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; highlight?: boolean }) {
  return (
    <View style={[styles.chip, highlight && { borderColor: colors.gold, backgroundColor: colors.goldSoft }]}>
      <Ionicons name={icon} size={12} color={highlight ? colors.gold : colors.muted} />
      <Text style={[styles.chipText, highlight && { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 10 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center', marginVertical: 16 },
  demo: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.goldDim,
    backgroundColor: colors.goldSoft,
    marginBottom: 12,
  },
  demoText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  cardKicker: { color: colors.accent, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 },
  cardTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 1 },
  example: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  section: { color: colors.text, fontFamily: fonts.title, fontSize: 18, marginTop: 8, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  chipText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 17 },
  match: { alignItems: 'center' },
  matchValue: { color: colors.accent, fontFamily: fonts.title, fontSize: 18 },
  matchLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  bio: { color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  connect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  connectDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  connectText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 13 },
  group: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  join: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.accent },
  joined: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
  joinText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 12 },
});
