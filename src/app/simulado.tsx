import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AutoImage, QuestionText } from '@/components/question-text';
import { Chunky } from '@/components/roadmap';
import { Sheet } from '@/components/sheet';
import { AREA_STYLE, onColor, shade } from '@/components/subject-style';
import { Loading, PressableScale, ProgressBar } from '@/components/ui';
import { areaById } from '@/data/catalog';
import { saveSimuladoTime, useActiveSimulado, useAnswer, useFinishSimulado } from '@/lib/queries';
import type { Simulado } from '@/lib/types';
import { enterStep } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

// Resolver simulado: uma questão por vez, gabarito só no final, como na prova.
export default function SimuladoScreen() {
  const active = useActiveSimulado();
  // Set while finishing, so the "no active simulado" redirect doesn't race the result screen.
  const [leaving, setLeaving] = useState(false);

  if (active.data === undefined) return <Loading error={active.isError} onRetry={() => active.refetch()} />;
  if (!active.data) return leaving ? null : <Redirect href="/questoes" />;
  return <Exam sim={active.data} onLeaving={setLeaving} />;
}

function Exam({ sim, onLeaving }: { sim: Simulado; onLeaving: (leaving: boolean) => void }) {
  const answer = useAnswer();
  const finish = useFinishSimulado();

  const [i, setI] = useState(0);
  const [seconds, setSeconds] = useState(sim.seconds);
  const [map, setMap] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const secondsRef = useRef(seconds);
  // Once finishing starts the time is already saved, and there's no simulado in progress to save it to.
  const finishing = useRef(false);
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  // The clock runs here; the API gets the time every 10 s and when the screen closes.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    const save = setInterval(() => saveSimuladoTime(secondsRef.current), 10_000);
    return () => {
      clearInterval(id);
      clearInterval(save);
      if (!finishing.current) saveSimuladoTime(secondsRef.current);
    };
  }, []);

  const q = sim.questions[i];
  const chosen = sim.answers[q.key];
  const answered = Object.keys(sim.answers).length;
  const blank = sim.questions.length - answered;
  const st = AREA_STYLE[q.area];
  const extraFiles = q.files.filter((f) => !q.context.includes(f));
  const last = i === sim.questions.length - 1;

  const done = async () => {
    setError(null);
    onLeaving(true);
    finishing.current = true;
    await saveSimuladoTime(secondsRef.current);
    try {
      const result = await finish.mutateAsync();
      router.replace({ pathname: '/resultado/[id]', params: { id: result.id } });
    } catch {
      finishing.current = false;
      onLeaving(false);
      setError('Não deu para finalizar agora. Confira sua internet e tente de novo.');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.top}>
          <PressableScale scaleTo={0.85} onPress={() => router.back()} accessibilityLabel="Sair e continuar depois" style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <ProgressBar value={answered / sim.questions.length} color={st.color} />
          </View>
          <View style={styles.timer}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={styles.timerText}>{clock(seconds)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View key={q.key} entering={enterStep()}>
            <View style={styles.meta}>
              <View style={[styles.areaChip, { backgroundColor: st.color }]}>
                <Ionicons name={st.icon} size={12} color={onColor(st.color)} />
                <Text style={[styles.areaText, { color: onColor(st.color) }]}>{areaById(q.area).name}</Text>
              </View>
              <Text style={styles.metaText}>
                Questão {i + 1} de {sim.questions.length} · ENEM {q.year}, nº {q.index}
              </Text>
            </View>

            {q.context ? <QuestionText md={q.context} /> : null}
            {extraFiles.map((f) => (
              <View key={f} style={{ marginTop: 10 }}>
                <AutoImage uri={f} />
              </View>
            ))}
            {q.intro ? (
              <View style={{ marginTop: 14 }}>
                <QuestionText md={q.intro} style={{ fontFamily: fonts.semibold }} />
              </View>
            ) : null}

            <View style={{ gap: 10, marginTop: 18 }}>
              {q.alternatives.map((a) => {
                const on = chosen === a.letter;
                return (
                  <PressableScale
                    key={a.letter}
                    scaleTo={0.97}
                    onPress={() => answer.mutate({ key: q.key, letter: a.letter })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Alternativa ${a.letter}${a.text ? `: ${a.text}` : ''}`}
                    style={[styles.alt, on && { borderColor: st.color, backgroundColor: colors.surface }]}>
                    <View style={[styles.letter, on && { backgroundColor: st.color, borderColor: st.color }]}>
                      <Text style={[styles.letterText, on && { color: onColor(st.color) }]}>{a.letter}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {a.text ? <Text style={styles.altText}>{a.text}</Text> : null}
                      {a.file ? <AutoImage uri={a.file} maxHeight={200} /> : null}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.footer}>
          <PressableScale scaleTo={0.9} disabled={i === 0} onPress={() => setI(i - 1)} style={[styles.navBtn, i === 0 && { opacity: 0.35 }]} accessibilityLabel="Questão anterior">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </PressableScale>
          <PressableScale scaleTo={0.92} onPress={() => setMap(true)} style={styles.mapBtn} accessibilityLabel="Ver todas as questões">
            <Ionicons name="grid-outline" size={16} color={colors.text} />
            <Text style={styles.mapText}>
              {answered}/{sim.questions.length}
            </Text>
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Chunky
              width="100%"
              height={46}
              radius={12}
              face={last ? colors.gold : st.color}
              base={shade(last ? colors.gold : st.color)}
              label={last ? 'Finalizar simulado' : 'Próxima questão'}
              onPress={() => (last ? (blank ? setConfirm(true) : done()) : setI(i + 1))}>
              <Text style={[styles.cta, { color: last ? colors.goldText : onColor(st.color) }]}>
                {last ? 'FINALIZAR' : 'PRÓXIMA'}
              </Text>
            </Chunky>
          </View>
        </View>
      </View>

      <Sheet visible={map} onClose={() => setMap(false)}>
        <Text style={styles.sheetTitle}>Questões</Text>
        <View style={styles.grid}>
          {sim.questions.map((qq, n) => {
            const a = sim.answers[qq.key];
            return (
              <PressableScale
                key={qq.key}
                scaleTo={0.85}
                onPress={() => {
                  setI(n);
                  setMap(false);
                }}
                style={[
                  styles.cell,
                  a && { backgroundColor: AREA_STYLE[qq.area].color, borderColor: AREA_STYLE[qq.area].color },
                  n === i && { borderColor: colors.text },
                ]}>
                <Text style={[styles.cellText, a && { color: onColor(AREA_STYLE[qq.area].color) }]}>{n + 1}</Text>
              </PressableScale>
            );
          })}
        </View>
        <View style={{ marginTop: 16 }}>
          <Chunky width="100%" height={50} radius={14} face={colors.gold} base={shade(colors.gold)} label="Finalizar simulado" onPress={() => (setMap(false), blank ? setConfirm(true) : done())}>
            <Text style={[styles.cta, { color: colors.goldText }]}>FINALIZAR SIMULADO</Text>
          </Chunky>
        </View>
      </Sheet>

      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Text style={styles.sheetTitle}>
          {blank} {blank === 1 ? 'questão em branco' : 'questões em branco'}
        </Text>
        <Text style={styles.sheetText}>No ENEM, chutar não tira ponto. Quer revisar antes de ver o resultado?</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          <Chunky width="100%" height={48} radius={14} face={colors.accent} base={shade(colors.accent)} label="Revisar em branco" onPress={() => {
            const first = sim.questions.findIndex((qq) => !sim.answers[qq.key]);
            setConfirm(false);
            if (first >= 0) setI(first);
          }}>
            <Text style={[styles.cta, { color: colors.accentText }]}>IR PARA A PRIMEIRA EM BRANCO</Text>
          </Chunky>
          <PressableScale scaleTo={0.96} onPress={() => (setConfirm(false), done())} style={styles.ghost}>
            <Text style={styles.ghostText}>Finalizar mesmo assim</Text>
          </PressableScale>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  screen: { flex: 1, backgroundColor: colors.ink },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64, justifyContent: 'flex-end' },
  timerText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13, fontVariant: ['tabular-nums'] },
  content: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  areaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  areaText: { fontFamily: fonts.bold, fontSize: 11 },
  metaText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  alt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  altText: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, paddingTop: 3 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  navBtn: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mapText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  cta: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  sheetTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 20, marginBottom: 12 },
  sheetText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  ghost: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  ghostText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 14 },
});
