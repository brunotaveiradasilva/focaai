import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AREA_STYLE, IconName, SUBJECT_ICON } from '@/components/subject-style';
import { Card, Kicker, Pill, PillRow, PressableScale, ProgressBar, Screen, Sub, Title } from '@/components/ui';
import { SUBJECTS, roadmap } from '@/data/catalog';
import { formatMin } from '@/lib/coach';
import { DAY_LETTERS, addDays, dateKey, examIdsOf, weekdayIndex } from '@/lib/planner';
import { areaAccuracy, bestStreak, lastDays, minutesBySubject, questionTotals, streak } from '@/lib/stats';
import { useApp } from '@/store/app';
import { enterUp } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

// Evolução — progresso real, a partir dos check-ins e simulados
export default function Evolucao() {
  const profile = useApp((s) => s.profile)!;
  const checkins = useApp((s) => s.checkins);
  const simulados = useApp((s) => s.simulados);
  const progress = useApp((s) => s.progress);
  const [range, setRange] = useState<7 | 30>(7);

  const today = new Date();
  const days = lastDays(checkins, range, today);
  const total = days.reduce((a, d) => a + d.minutes, 0);
  const maxDay = Math.max(60, ...days.map((d) => d.minutes));
  const current = streak(profile, checkins, simulados, today);
  const best = Math.max(current, bestStreak(profile, checkins, simulados));
  const q = questionTotals(checkins, simulados);
  const areas = areaAccuracy(simulados);
  const bySubject = minutesBySubject(checkins, dateKey(addDays(today, -range + 1)));
  const maxSubject = Math.max(1, ...Object.values(bySubject).map((v) => v ?? 0));
  const empty = !checkins.length && !simulados.length;

  // Plain-language insights from the numbers.
  const insights: { icon: IconName; text: string }[] = [];
  const weakArea = areas.filter((a) => a.pct !== null && a.total >= 5).sort((a, b) => a.pct! - b.pct!)[0];
  if (weakArea && weakArea.pct! < 0.6) {
    insights.push({
      icon: 'alert-circle',
      text: `${weakArea.area.name} é seu ponto de atenção: ${Math.round(weakArea.pct! * 100)}% de acerto nos simulados. Vale um bloco extra dessa área por semana.`,
    });
  }
  const untouched = SUBJECTS.filter((s) => profile.levels[s.id] === 1 && !bySubject[s.id]);
  if (untouched.length) {
    insights.push({
      icon: 'eye-off',
      text: `Nos últimos ${range} dias você não registrou estudo de ${untouched.map((s) => s.name).join(', ')}, que você marcou como difícil.`,
    });
  }
  if (current >= 3) insights.push({ icon: 'flame', text: `${current} dias seguidos! Constância vale mais que maratona.` });
  if (q.total >= 20 && q.pct !== null && q.pct >= 0.7) {
    insights.push({ icon: 'trophy', text: `${Math.round(q.pct * 100)}% de acerto geral. Hora de puxar simulados mais longos.` });
  }

  return (
    <Screen>
      <Kicker>Evolução</Kicker>
      <Title>Seu progresso real</Title>
      <Sub>Tudo aqui vem dos seus check-ins e simulados.</Sub>

      <PillRow>
        <Pill label="7 dias" selected={range === 7} onPress={() => setRange(7)} />
        <Pill label="30 dias" selected={range === 30} onPress={() => setRange(30)} />
      </PillRow>

      {empty ? (
        <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
          <Ionicons name="analytics-outline" size={30} color={colors.accent} />
          <Text style={styles.cardTitle}>Seus gráficos aparecem aqui</Text>
          <Text style={[styles.muted, { textAlign: 'center' }]}>
            Faça o check-in de um bloco no Início ou resolva um simulado no Banco de Questões para começar.
          </Text>
          <PressableScale scaleTo={0.95} onPress={() => router.push('/questoes')} style={styles.btn}>
            <Text style={styles.btnText}>Fazer um simulado</Text>
          </PressableScale>
        </Card>
      ) : null}

      <View style={styles.tiles}>
        <Tile icon="time" color={colors.accent} value={formatMin(total)} label={`estudados em ${range} dias`} />
        <Tile icon="flame" color={colors.gold} value={`${current}`} label={`dias seguidos · recorde ${best}`} />
        <Tile icon="checkmark-circle" color="#5BD68A" value={q.pct === null ? '–' : `${Math.round(q.pct * 100)}%`} label={`acerto em ${q.total} questões`} />
        <Tile icon="document-text" color={colors.purple} value={`${simulados.length}`} label="simulados feitos" />
      </View>

      <Animated.View entering={enterUp()}>
        <Card>
          <Text style={styles.cardTitle}>Horas por dia</Text>
          <View style={styles.chart}>
            {days.map((d, i) => {
              const h = Math.max(2, (d.minutes / maxDay) * 110);
              const isToday = d.key === dateKey(today);
              return (
                <View key={d.key} style={styles.barCol}>
                  {range === 7 && d.minutes ? <Text style={styles.barValue}>{formatMin(d.minutes)}</Text> : null}
                  <View
                    style={[
                      styles.bar,
                      { height: h, backgroundColor: d.minutes ? (isToday ? colors.accent : colors.accentDim) : colors.line },
                      range === 30 && { marginHorizontal: 1 },
                    ]}
                  />
                  {range === 7 || i % 5 === 0 ? (
                    <Text style={[styles.barLabel, isToday && { color: colors.accent }]}>
                      {range === 7 ? DAY_LETTERS[weekdayIndex(d.date)] : d.date.getDate()}
                    </Text>
                  ) : (
                    <Text style={styles.barLabel}> </Text>
                  )}
                </View>
              );
            })}
          </View>
        </Card>
      </Animated.View>

      {insights.length ? (
        <Card style={{ gap: 10, borderColor: colors.accentDim }}>
          <Text style={styles.cardTitle}>Pontos de atenção</Text>
          {insights.map((ins) => (
            <View key={ins.text} style={styles.insight}>
              <Ionicons name={ins.icon} size={16} color={colors.accent} />
              <Text style={styles.insightText}>{ins.text}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <Text style={styles.cardTitle}>Acerto por área nos simulados</Text>
        {areas.map((a) => (
          <View key={a.area.id} style={{ gap: 4 }}>
            <View style={styles.rowHead}>
              <Ionicons name={AREA_STYLE[a.area.id].icon} size={14} color={AREA_STYLE[a.area.id].color} />
              <Text style={styles.rowName}>{a.area.name}</Text>
              <Text style={styles.rowValue}>{a.pct === null ? 'sem dados' : `${Math.round(a.pct * 100)}% · ${a.total} q.`}</Text>
            </View>
            <ProgressBar value={a.pct ?? 0} color={AREA_STYLE[a.area.id].color} />
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>Tempo por matéria</Text>
        {SUBJECTS.map((s) => {
          const m = bySubject[s.id] ?? 0;
          return (
            <View key={s.id} style={styles.subjRow}>
              <Ionicons name={SUBJECT_ICON[s.id]} size={14} color={s.color} />
              <Text style={styles.subjName}>{s.short}</Text>
              <View style={styles.subjTrack}>
                <View style={[styles.subjFill, { width: `${(m / maxSubject) * 100}%`, backgroundColor: s.color }]} />
              </View>
              <Text style={styles.subjValue}>{m ? formatMin(m) : '–'}</Text>
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>Roadmap</Text>
        {SUBJECTS.map((s) => {
          const track = roadmap(s.id, examIdsOf(profile));
          const done = track.reduce((a, t) => a + Math.min(t.lessons, progress[t.id] ?? 0), 0);
          const totalL = track.reduce((a, t) => a + t.lessons, 0);
          return (
            <View key={s.id} style={{ gap: 4 }}>
              <View style={styles.rowHead}>
                <Ionicons name={SUBJECT_ICON[s.id]} size={14} color={s.color} />
                <Text style={styles.rowName}>{s.name}</Text>
                <Text style={styles.rowValue}>{Math.round((done / totalL) * 100)}%</Text>
              </View>
              <ProgressBar value={done / totalL} color={s.color} />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function Tile({ icon, color, value, label }: { icon: IconName; color: string; value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16, marginTop: 8 },
  btnText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 13 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  tileValue: { color: colors.text, fontFamily: fonts.title, fontSize: 22 },
  tileLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 150, marginTop: 12 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '70%', maxWidth: 28, borderRadius: 6 },
  barValue: { color: colors.muted, fontFamily: fonts.medium, fontSize: 9 },
  barLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 10, fontVariant: ['tabular-nums'] },
  insight: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  rowValue: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
  subjRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjName: { width: 36, color: colors.text, fontFamily: fonts.medium, fontSize: 12 },
  subjTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  subjFill: { height: 10, borderRadius: 5 },
  subjValue: { width: 52, textAlign: 'right', color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
});
