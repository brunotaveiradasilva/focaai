import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SUBJECT_ICON } from '@/components/subject-style';
import { Card, Kicker, Loading, PressableScale, Screen, Sub, Title } from '@/components/ui';
import { TIERS, TRACK_LABEL, courseById, subjectById } from '@/data/catalog';
import { useConnect, usePeople, usePlanSummary, useProfile, useStats, useToggleGroup } from '@/lib/queries';
import { enterUp } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const PERIOD = ['manhã', 'tarde', 'noite'];

// Pessoas — conexão com quem tem o mesmo objetivo
export default function Pessoas() {
  const profile = useProfile()!;
  const people = usePeople();
  const goal = usePlanSummary().data?.goalLabel ?? '';
  const myStreak = useStats(7).data?.streak ?? 0;
  const connect = useConnect();
  const toggleGroup = useToggleGroup();
  if (!people.data) return <Loading error={people.isError} onRetry={() => people.refetch()} />;

  // Matching runs in the API (still over example profiles, see the notice below).
  const { matches, groups } = people.data;
  const course = courseById(profile.courseId);

  return (
    <Screen>
      <Kicker>Pessoas</Kicker>
      <Title>Estude com quem quer o mesmo</Title>
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
    </Screen>
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
