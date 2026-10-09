import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoutineEditor } from '@/components/routine-editor';
import { Sheet } from '@/components/sheet';
import { SUBJECT_ICON } from '@/components/subject-style';
import { Button, Card, Kicker, Pill, PillRow, PressableScale, Screen, Title } from '@/components/ui';
import { EXAM_CALENDAR, SUBJECTS, TIERS, courseById } from '@/data/catalog';
import { formatMin } from '@/lib/coach';
import { followedExams, goalLabel, weeklyMinutes } from '@/lib/planner';
import { DEFAULT_ROUTINE, fmtTime } from '@/lib/routine';
import { useApp } from '@/store/app';
import { colors, fonts } from '@/theme/tokens';

const LEVEL_LABEL = { 1: 'Difícil', 2: 'Razoável', 3: 'Domino' } as const;
const DAILY = [60, 120, 180, 240, 300];
const SESSIONS = [50, 90, 120];

// Perfil do estudante
export default function Perfil() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const reset = useApp((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  const [editWeek, setEditWeek] = useState(false);
  if (!profile) return null;

  const course = courseById(profile.courseId);
  const exams = followedExams(profile);

  return (
    <Screen>
      <View style={styles.top}>
        <PressableScale scaleTo={0.85} onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <Kicker style={{ marginBottom: 0 }}>Perfil</Kicker>
      </View>
      <Title>{profile.name}</Title>
      <Text style={styles.muted}>{goalLabel(profile)}</Text>

      <Card style={{ gap: 8, marginTop: 14 }}>
        <Text style={styles.cardTitle}>Objetivo</Text>
        <Row label="Curso" value={`${course.name} · concorrência ${TIERS[course.tier].label.toLowerCase()}`} />
        <Row label="Provas" value={exams.length ? exams.map((e) => e.name).join(', ') : `Ciclo ${profile.cycle}: datas ainda não divulgadas`} />
        <Row label="Idioma" value={profile.language === 'ingles' ? 'Inglês' : 'Espanhol'} />
      </Card>

      <Card style={{ gap: 4 }}>
        <Text style={styles.cardTitle}>Rotina</Text>
        <Text style={styles.muted}>{formatMin(weeklyMinutes(profile))} por semana. Mudar aqui refaz o cronograma a partir de amanhã.</Text>
        <Text style={styles.label}>Tempo por dia</Text>
        <PillRow>
          {DAILY.map((m) => (
            <Pill key={m} label={formatMin(m)} selected={profile.minutesPerDay === m} onPress={() => updateProfile({ minutesPerDay: m })} />
          ))}
        </PillRow>
        <Text style={styles.label}>Duração dos blocos</Text>
        <PillRow>
          {SESSIONS.map((m) => (
            <Pill key={m} label={formatMin(m)} selected={profile.sessionMin === m} onPress={() => updateProfile({ sessionMin: m })} />
          ))}
        </PillRow>
        <Text style={styles.label}>Semana fixa</Text>
        <Text style={styles.muted}>
          {profile.routine
            ? `Acorda ${fmtTime(profile.routine.wake)}, dorme ${fmtTime(profile.routine.sleep)} · ${profile.routine.items.length} compromissos na semana`
            : 'Nada cadastrado: o cronograma usa os turnos marcados inteiros.'}
        </Text>
        <Button label="Editar minha semana" variant="ghost" style={{ marginTop: 10 }} onPress={() => setEditWeek(true)} />
      </Card>

      <Sheet visible={editWeek} onClose={() => setEditWeek(false)}>
        <Text style={styles.sheetTitle}>Sua semana</Text>
        <RoutineEditor
          value={profile.routine ?? DEFAULT_ROUTINE}
          onChange={(routine) => updateProfile({ routine })}
          week={profile.week}
        />
        <Button label="Pronto" variant="ghost" style={{ marginTop: 10 }} onPress={() => setEditWeek(false)} />
      </Sheet>

      <Card style={{ gap: 8 }}>
        <Text style={styles.cardTitle}>Nível por matéria</Text>
        {SUBJECTS.map((s) => (
          <View key={s.id} style={styles.levelRow}>
            <Ionicons name={SUBJECT_ICON[s.id]} size={14} color={s.color} />
            <Text style={styles.levelName}>{s.name}</Text>
            <PressableScale
              scaleTo={0.9}
              onPress={() => updateProfile({ levels: { ...profile.levels, [s.id]: ((profile.levels[s.id] % 3) + 1) as 1 | 2 | 3 } })}
              style={styles.levelBtn}>
              <Text style={styles.levelText}>{LEVEL_LABEL[profile.levels[s.id]]}</Text>
            </PressableScale>
          </View>
        ))}
        <Text style={styles.hint}>Toque no nível para trocar. O plano dá mais espaço às matérias marcadas como difíceis.</Text>
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={styles.cardTitle}>Datas das provas</Text>
        <Text style={styles.hint}>
          Conferidas nas fontes oficiais em{' '}
          {new Date(`${EXAM_CALENDAR[0].checkedAt}T12:00:00`).toLocaleDateString('pt-BR')}. Provas sem data oficial não aparecem com data.
        </Text>
      </Card>

      <View style={{ gap: 10, marginTop: 6 }}>
        <Button label="Refazer o questionário" variant="ghost" style={{ flexGrow: 1 }} onPress={() => router.push('/onboarding')} />
        <Button label="Apagar meus dados" variant="ghost" style={{ flexGrow: 1 }} onPress={() => setConfirm(true)} />
      </View>

      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Text style={styles.sheetTitle}>Apagar todos os dados?</Text>
        <Text style={styles.muted}>Perfil, check-ins, simulados e progresso do roadmap deste aparelho serão apagados. Não dá para desfazer.</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          <Button
            label="Apagar tudo"
            onPress={() => {
              setConfirm(false);
              reset();
              router.replace('/');
            }}
          />
          <Button label="Cancelar" variant="ghost" style={{ flexGrow: 1 }} onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  cardTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginTop: 10, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  rowLabel: { width: 64, color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  rowValue: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelName: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  levelBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, minWidth: 84, alignItems: 'center' },
  levelText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12 },
  sheetTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 20, marginBottom: 8 },
});
