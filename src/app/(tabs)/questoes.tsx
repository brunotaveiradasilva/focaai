import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chunky } from '@/components/roadmap';
import { AREA_STYLE, onColor, shade } from '@/components/subject-style';
import { Card, Kicker, Pill, PillRow, PressableScale, Screen, Stepper, Sub, Title } from '@/components/ui';
import { AREAS, Area, SUBJECTS, areaById, areaOfSubject } from '@/data/catalog';
import { formatMin } from '@/lib/coach';
import { FIRST_YEAR, LAST_YEAR, RECENT_FROM, SNAPSHOT_YEARS, buildSimulado } from '@/lib/enem';
import { questionTotals, scoreOf } from '@/lib/stats';
import { useApp } from '@/store/app';
import { enterUp } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const COUNTS = [5, 10, 20, 45, 90];

// Banco de Questões — simulados sob medida com questões reais do ENEM
export default function Questoes() {
  const params = useLocalSearchParams<{ area?: Area }>();
  const profile = useApp((s) => s.profile)!;
  const simulados = useApp((s) => s.simulados);
  const checkins = useApp((s) => s.checkins);
  const active = useApp((s) => s.activeSimulado);
  const startSimulado = useApp((s) => s.startSimulado);
  const discardSimulado = useApp((s) => s.discardSimulado);

  const [areas, setAreas] = useState<Area[]>(params.area ? [params.area] : AREAS.map((a) => a.id));
  const [count, setCount] = useState(params.area ? 10 : 20);
  const [range, setRange] = useState<'recentes' | 'todos'>('recentes');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The roadmap can open this tab with an area already chosen.
  useEffect(() => {
    if (params.area) {
      setAreas([params.area]);
      setCount(10);
    }
  }, [params.area]);

  const totals = questionTotals(checkins, simulados);
  const weakAreas = [...new Set(SUBJECTS.filter((s) => profile.levels[s.id] === 1).map((s) => areaOfSubject(s.id)))];

  const generate = async (cfgAreas: Area[], n: number) => {
    setError(null);
    setLoading('Separando questões…');
    try {
      const seen = new Set(simulados.flatMap((s) => s.questions.map((q) => q.key)));
      const questions = await buildSimulado(
        { areas: cfgAreas, count: n, range, lang: profile.language, seen },
        (msg) => setLoading(msg),
      );
      if (!questions.length) throw new Error('empty');
      startSimulado({
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        areas: cfgAreas,
        questions,
        answers: {},
        seconds: 0,
      });
      router.push('/simulado');
    } catch {
      setError('Não foi possível baixar as questões. Confira sua internet e tente de novo.');
    } finally {
      setLoading(null);
    }
  };

  const toggleArea = (a: Area) =>
    setAreas((xs) => (xs.includes(a) ? (xs.length > 1 ? xs.filter((x) => x !== a) : xs) : [...xs, a]));

  return (
    <Screen>
      <Kicker>Banco de Questões</Kicker>
      <Title>Questões reais do ENEM</Title>
      <Sub>
        {SNAPSHOT_YEARS
          ? `Versão de teste: questões sem figura das provas de ${SNAPSHOT_YEARS[0]} a ${SNAPSHOT_YEARS[SNAPSHOT_YEARS.length - 1]}. No app instalado são mais de 2.700, de ${FIRST_YEAR} a ${LAST_YEAR}.`
          : `Mais de 2.700 questões das provas de ${FIRST_YEAR} a ${LAST_YEAR}. Monte o simulado do seu jeito e veja o resultado na hora.`}
      </Sub>

      <View style={styles.stats}>
        <Stat value={`${totals.total}`} label="questões feitas" />
        <Stat value={totals.pct === null ? '–' : `${Math.round(totals.pct * 100)}%`} label="de acerto" />
        <Stat value={`${simulados.length}`} label={simulados.length === 1 ? 'simulado' : 'simulados'} />
      </View>

      {active ? (
        <Animated.View entering={enterUp()}>
          <Card style={styles.active}>
            <Text style={styles.cardTitle}>Simulado em andamento</Text>
            <Text style={styles.cardText}>
              {Object.keys(active.answers).length} de {active.questions.length} respondidas · {formatMin(Math.round(active.seconds / 60))}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <PressableScale scaleTo={0.95} onPress={() => router.push('/simulado')} style={styles.btn}>
                <Text style={styles.btnText}>Continuar</Text>
              </PressableScale>
              <PressableScale scaleTo={0.95} onPress={discardSimulado} style={[styles.btn, styles.btnGhost]}>
                <Text style={[styles.btnText, { color: colors.muted }]}>Descartar</Text>
              </PressableScale>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {weakAreas.length ? (
        <PressableScale
          scaleTo={0.97}
          disabled={!!loading}
          onPress={() => generate(weakAreas, 10)}
          style={styles.quick}
          accessibilityRole="button">
          <View style={styles.quickIcon}>
            <Ionicons name="flash" size={20} color={colors.goldText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle}>Desafio rápido</Text>
            <Text style={styles.cardText}>
              10 questões de {weakAreas.map((a) => areaById(a).name).join(' e ')}, onde você disse ter mais dificuldade.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </PressableScale>
      ) : null}

      <Text style={styles.section}>Montar simulado</Text>
      <Text style={styles.label}>Áreas</Text>
      <View style={styles.areas}>
        {AREAS.map((a) => {
          const on = areas.includes(a.id);
          const st = AREA_STYLE[a.id];
          return (
            <PressableScale
              key={a.id}
              scaleTo={0.93}
              onPress={() => toggleArea(a.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.area, on && { borderColor: st.color, backgroundColor: colors.surface }]}>
              <View style={[styles.areaIcon, { backgroundColor: on ? st.color : colors.surface }]}>
                <Ionicons name={st.icon} size={18} color={on ? onColor(st.color) : st.color} />
              </View>
              <Text style={[styles.areaText, on && { color: colors.text }]} numberOfLines={2}>
                {a.name}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={styles.label}>Número de questões</Text>
      <PillRow>
        {COUNTS.map((n) => (
          <Pill key={n} label={String(n)} selected={count === n} onPress={() => setCount(n)} />
        ))}
      </PillRow>
      <Stepper label="Ou escolha" value={count} min={1} max={180} step={1} onChange={setCount} suffix=" questões" />

      {SNAPSHOT_YEARS ? null : <Text style={styles.label}>Provas</Text>}
      {SNAPSHOT_YEARS ? null : (
      <PillRow>
        <Pill label={`Recentes (${RECENT_FROM}–${LAST_YEAR})`} selected={range === 'recentes'} onPress={() => setRange('recentes')} />
        <Pill label={`Todas (${FIRST_YEAR}–${LAST_YEAR})`} selected={range === 'todos'} onPress={() => setRange('todos')} />
      </PillRow>
      )}
      <Text style={styles.hint}>
        Tempo sugerido: {formatMin(count * 3)} (cerca de 3 min por questão, como no ENEM). As questões de língua estrangeira
        seguem o seu idioma ({profile.language === 'ingles' ? 'inglês' : 'espanhol'}).
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ marginTop: 14, marginBottom: 8 }}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.cardText}>{loading}</Text>
          </View>
        ) : (
          <Chunky
            width="100%"
            height={52}
            radius={14}
            face={colors.accent}
            base={shade(colors.accent)}
            label="Gerar simulado"
            onPress={() => generate(areas, count)}>
            <Text style={styles.cta}>GERAR SIMULADO · {count} QUESTÕES</Text>
          </Chunky>
        )}
      </View>

      {simulados.length ? (
        <>
          <Text style={styles.section}>Seus simulados</Text>
          {simulados.map((s) => {
            const sc = scoreOf(s);
            const pct = sc.total ? Math.round((sc.correct / sc.total) * 100) : 0;
            return (
              <PressableScale
                key={s.id}
                scaleTo={0.97}
                onPress={() => router.push({ pathname: '/resultado/[id]', params: { id: s.id } })}
                style={styles.history}>
                <View style={[styles.score, { borderColor: pct >= 70 ? colors.accent : pct >= 50 ? colors.gold : colors.danger }]}>
                  <Text style={styles.scoreText}>{pct}%</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle}>
                    {sc.correct} de {sc.total} questões
                  </Text>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {new Date(s.finishedAt ?? s.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} ·{' '}
                    {s.areas.map((a) => areaById(a).short).join(', ')} · {formatMin(Math.max(1, Math.round(s.seconds / 60)))}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </PressableScale>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  statValue: { color: colors.text, fontFamily: fonts.title, fontSize: 20 },
  statLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  active: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  cardTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  cardText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  btnText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 13 },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.goldDim,
    backgroundColor: colors.goldSoft,
    marginBottom: 6,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  section: { color: colors.text, fontFamily: fonts.title, fontSize: 18, marginTop: 14, marginBottom: 10 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginBottom: 8 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  areas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  area: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  areaIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  areaText: { flex: 1, color: colors.muted, fontFamily: fonts.semibold, fontSize: 13 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, marginTop: 10 },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cta: { color: colors.accentText, fontFamily: fonts.bold, fontSize: 15, letterSpacing: 0.5 },
  history: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    marginBottom: 8,
  },
  score: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
});
