import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AutoImage, QuestionText } from '@/components/question-text';
import { Chunky } from '@/components/roadmap';
import { AREA_STYLE, shade } from '@/components/subject-style';
import { Card, Kicker, Loading, PressableScale, ProgressBar, Screen } from '@/components/ui';
import { AREAS, areaById } from '@/data/catalog';
import { formatMin } from '@/lib/format';
import { useSimulado } from '@/lib/queries';
import { enterFade, enterUp } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const GOOD = '#5BD68A';

function verdict(pct: number) {
  if (pct >= 80) return 'Excelente! Você está no ritmo de quem disputa as vagas mais concorridas.';
  if (pct >= 60) return 'Bom resultado. Revise os erros abaixo: é neles que estão os próximos pontos.';
  if (pct >= 40) return 'Você está construindo a base. Revise cada erro com calma, isso vale mais que fazer outro simulado agora.';
  return 'Começo de caminho. Use a revisão abaixo e o Roadmap para reforçar os assuntos que apareceram.';
}

// Resultado do simulado
export default function Resultado() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useSimulado(id);
  const [open, setOpen] = useState<string | null>(null);
  if (query.isError) return <Redirect href="/questoes" />;
  if (!query.data) return <Loading />;
  const sim = query.data;
  // An unfinished simulado has no answer key yet: it belongs on the exam screen.
  if (!sim.score) return <Redirect href="/simulado" />;

  const sc = sim.score;
  const pct = sc.total ? Math.round((sc.correct / sc.total) * 100) : 0;
  const color = pct >= 70 ? colors.accent : pct >= 50 ? colors.gold : colors.danger;
  const perQ = sc.total ? Math.round(sim.seconds / sc.total) : 0;

  return (
    <Screen
      footer={
        <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
          <PressableScale scaleTo={0.95} onPress={() => router.replace('/evolucao')} style={styles.ghost}>
            <Text style={styles.ghostText}>Ver evolução</Text>
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Chunky width="100%" height={48} radius={14} face={colors.accent} base={shade(colors.accent)} label="Novo simulado" onPress={() => router.replace('/questoes')}>
              <Text style={styles.cta}>NOVO SIMULADO</Text>
            </Chunky>
          </View>
        </View>
      }>
      <Kicker>Resultado do simulado</Kicker>
      <Animated.View entering={enterFade()} style={styles.hero}>
        <View style={[styles.score, { borderColor: color }]}>
          <Text style={[styles.pct, { color }]}>{pct}%</Text>
          <Text style={styles.scoreSub}>
            {sc.correct} de {sc.total}
          </Text>
        </View>
      </Animated.View>
      <Text style={styles.verdict}>{verdict(pct)}</Text>
      <View style={styles.row}>
        <Mini icon="time-outline" value={formatMin(Math.max(1, Math.round(sim.seconds / 60)))} label="no total" />
        <Mini icon="speedometer-outline" value={`${Math.floor(perQ / 60)}:${String(perQ % 60).padStart(2, '0')}`} label="por questão" />
        <Mini icon="help-circle-outline" value={`${sc.total - Object.keys(sim.answers).length}`} label="em branco" />
      </View>

      <Animated.View entering={enterUp(120)}>
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Por área</Text>
          {AREAS.filter((a) => sc.byArea[a.id]).map((a) => {
            const r = sc.byArea[a.id]!;
            return (
              <View key={a.id} style={{ gap: 4 }}>
                <View style={styles.areaHead}>
                  <Ionicons name={AREA_STYLE[a.id].icon} size={14} color={AREA_STYLE[a.id].color} />
                  <Text style={styles.areaName}>{a.name}</Text>
                  <Text style={styles.areaPct}>
                    {r.correct}/{r.total}
                  </Text>
                </View>
                <ProgressBar value={r.correct / r.total} color={AREA_STYLE[a.id].color} />
              </View>
            );
          })}
        </Card>
      </Animated.View>

      <Text style={styles.section}>Revise suas respostas</Text>
      {sim.questions.map((q, n) => {
        const mine = sim.answers[q.key];
        const ok = mine === q.correct;
        const expanded = open === q.key;
        return (
          <View key={q.key} style={styles.review}>
            <PressableScale scaleTo={0.98} onPress={() => setOpen(expanded ? null : q.key)} style={styles.reviewHead}>
              <View style={[styles.mark, { backgroundColor: ok ? GOOD : mine ? colors.danger : colors.line }]}>
                <Ionicons name={ok ? 'checkmark' : mine ? 'close' : 'remove'} size={14} color={colors.ink} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.reviewTitle}>
                  Questão {n + 1} · {areaById(q.area).name}
                </Text>
                <Text style={styles.reviewMeta}>
                  {mine ? `Sua resposta: ${mine}` : 'Em branco'} · Gabarito: {q.correct} · ENEM {q.year}
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </PressableScale>
            {expanded ? (
              <Animated.View entering={enterFade()} style={{ gap: 10, marginTop: 12 }}>
                {q.context ? <QuestionText md={q.context} /> : null}
                {q.files.filter((f) => !q.context.includes(f)).map((f) => (
                  <AutoImage key={f} uri={f} />
                ))}
                {q.intro ? <QuestionText md={q.intro} style={{ fontFamily: fonts.semibold }} /> : null}
                {q.alternatives.map((a) => {
                  const isRight = a.letter === q.correct;
                  const isMineWrong = a.letter === mine && !isRight;
                  return (
                    <View
                      key={a.letter}
                      style={[styles.alt, isRight && { borderColor: GOOD }, isMineWrong && { borderColor: colors.danger }]}>
                      <Text style={[styles.altLetter, isRight && { color: GOOD }, isMineWrong && { color: colors.danger }]}>{a.letter}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {a.text ? <Text style={styles.altText}>{a.text}</Text> : null}
                        {a.file ? <AutoImage uri={a.file} maxHeight={180} /> : null}
                      </View>
                      {isRight ? <Ionicons name="checkmark-circle" size={18} color={GOOD} /> : null}
                      {isMineWrong ? <Ionicons name="close-circle" size={18} color={colors.danger} /> : null}
                    </View>
                  );
                })}
              </Animated.View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

function Mini({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) {
  return (
    <View style={styles.mini}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 12 },
  score: { width: 150, height: 150, borderRadius: 75, borderWidth: 8, alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: fonts.titleBold, fontSize: 42 },
  scoreSub: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  verdict: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 14 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mini: { flex: 1, alignItems: 'center', gap: 2, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 },
  miniValue: { color: colors.text, fontFamily: fonts.title, fontSize: 17 },
  miniLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  cardTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  areaHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  areaName: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  areaPct: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
  section: { color: colors.text, fontFamily: fonts.title, fontSize: 18, marginTop: 10, marginBottom: 10 },
  review: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, marginBottom: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  reviewTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  reviewMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  alt: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line },
  altLetter: { color: colors.muted, fontFamily: fonts.bold, fontSize: 14, width: 16 },
  altText: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  ghost: { height: 54, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  cta: { color: colors.accentText, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
});
