import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chunky } from '@/components/roadmap';
import { Sheet } from '@/components/sheet';
import { SUBJECT_ICON, onColor, shade } from '@/components/subject-style';
import { Card, Pill, PillRow, PressableScale, Stepper } from '@/components/ui';
import { SubjectId, subjectById, topicById } from '@/data/catalog';
import { ACTIVITY_LABEL } from '@/lib/calendar';
import { MIN_CHECKIN_MIN, formatMin } from '@/lib/format';
import { useLogCheckin } from '@/lib/queries';
import type { Activity, Task } from '@/lib/types';
import { enterFade } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

export type CheckinTarget = {
  task?: Task;
  subject?: SubjectId;
  topicId?: string;
};

const FEELINGS: { value: 1 | 2 | 3; label: string; icon: 'happy-outline' | 'remove-circle-outline' | 'sad-outline' }[] = [
  { value: 1, label: 'Tranquilo', icon: 'happy-outline' },
  { value: 2, label: 'Ok', icon: 'remove-circle-outline' },
  { value: 3, label: 'Difícil', icon: 'sad-outline' },
];

// Free study materials for a topic; the app doesn't host its own course.
export function MaterialLinks({ topicTitle, subjectName }: { topicTitle: string; subjectName: string }) {
  const q = encodeURIComponent(`${topicTitle} ${subjectName} ENEM`);
  const links = [
    { icon: 'logo-youtube' as const, label: `Videoaulas de ${topicTitle}`, url: `https://www.youtube.com/results?search_query=${q}` },
    { icon: 'school-outline' as const, label: 'Exercícios no Khan Academy', url: `https://pt.khanacademy.org/search?page_search_query=${q}` },
  ];
  return (
    <View style={{ gap: 8 }}>
      {links.map((l) => (
        <PressableScale key={l.url} scaleTo={0.97} onPress={() => Linking.openURL(l.url)} style={styles.link}>
          <Ionicons name={l.icon} size={18} color={colors.muted} />
          <Text style={styles.linkText} numberOfLines={1}>
            {l.label}
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.muted} />
        </PressableScale>
      ))}
    </View>
  );
}

export function CheckinSheet({ target, onClose }: { target: CheckinTarget | null; onClose: () => void }) {
  return (
    <Sheet visible={!!target} onClose={onClose}>
      {/* Keyed so each opening starts from fresh answers. */}
      {target ? <CheckinBody key={target.task?.id ?? target.topicId ?? 'free'} target={target} onClose={onClose} /> : null}
    </Sheet>
  );
}

function CheckinBody({ target, onClose }: { target: CheckinTarget; onClose: () => void }) {
  const logCheckin = useLogCheckin();
  const task = target.task;
  const subjectId = task?.subject ?? target.subject;
  const topicId = task?.topicId ?? target.topicId;
  const topic = topicId ? topicById(topicId) : undefined;
  const subject = subjectId ? subjectById(subjectId) : undefined;
  const activity: Activity = task?.activity ?? 'teoria';
  const planned = task?.minutes ?? 50;
  const asksQuestions = activity === 'teoria' || activity === 'exercicios';

  const [minutes, setMinutes] = useState(planned);
  const [feeling, setFeeling] = useState<1 | 2 | 3>(2);
  const [questions, setQuestions] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const color = subject?.color ?? colors.accent;
  const title = task?.title ?? topic?.title ?? 'Estudo livre';
  const timeOptions = [...new Set([15, 30, 45, 60, 90, 120, planned])].sort((a, b) => a - b);

  const [error, setError] = useState<string | null>(null);

  // The API weighs the check-in: lessons credited, the subject's weight in the plan and why.
  const save = async () => {
    setError(null);
    try {
      const { lessons, adjustment } = await logCheckin.mutateAsync({
        at: new Date().toISOString(),
        taskId: minutes >= MIN_CHECKIN_MIN ? task?.id : undefined,
        subject: subjectId,
        topicId,
        activity,
        minutes,
        feeling,
        questions,
        correct: Math.min(correct, questions),
      });
      setResult(
        minutes < MIN_CHECKIN_MIN
          ? `Registrado no histórico. Sessões com menos de ${MIN_CHECKIN_MIN} min não concluem a tarefa.`
          : adjustment?.text ??
              `Boa! ${formatMin(minutes)} registrados${lessons > 0 && topic ? ` e você avançou ${lessons} ${lessons === 1 ? 'aula' : 'aulas'} em ${topic.title}` : ''}.`,
      );
    } catch {
      setError('Não deu para registrar agora. Confira sua internet e tente de novo.');
    }
  };

  if (result) {
    return (
      <Animated.View entering={enterFade()} style={{ alignItems: 'center', paddingVertical: 10 }}>
        <View style={[styles.doneBadge, { backgroundColor: color, borderBottomColor: shade(color) }]}>
          <Ionicons name="checkmark" size={38} color={onColor(color)} />
        </View>
        <Text style={styles.doneTitle}>Check-in feito</Text>
        <Text style={styles.doneText}>{result}</Text>
        <View style={{ width: '100%', marginTop: 18 }}>
          <Chunky width="100%" height={50} radius={14} face={colors.accent} base={shade(colors.accent)} onPress={onClose} label="Continuar">
            <Text style={[styles.cta, { color: colors.accentText }]}>CONTINUAR</Text>
          </Chunky>
        </View>
      </Animated.View>
    );
  }

  return (
    <View>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: color, borderBottomColor: shade(color) }]}>
          <Ionicons
            name={subject ? SUBJECT_ICON[subject.id] : activity === 'simulado' ? 'document-text' : 'refresh'}
            size={24}
            color={onColor(color)}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.kicker, { color }]}>
            {(subject ? `${subject.name} · ` : '') + ACTIVITY_LABEL[activity].toUpperCase()}
          </Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      {task ? (
        <Card style={{ gap: 10 }}>
          <Text style={styles.section}>O que fazer neste bloco</Text>
          {task.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNum, { borderColor: color }]}>
                <Text style={[styles.stepNumText, { color }]}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s.label}</Text>
              <Text style={styles.stepMin}>{formatMin(s.minutes)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {topic && subject ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.section}>Onde estudar</Text>
          <MaterialLinks topicTitle={topic.title} subjectName={subject.name} />
        </View>
      ) : null}

      <Text style={styles.section}>Quanto tempo você estudou?</Text>
      <PillRow>
        {timeOptions.map((m) => (
          <Pill key={m} label={formatMin(m)} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </PillRow>

      <Text style={styles.section}>Como foi?</Text>
      <View style={styles.feelings}>
        {FEELINGS.map((f) => {
          const on = feeling === f.value;
          return (
            <PressableScale
              key={f.value}
              scaleTo={0.92}
              onPress={() => setFeeling(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.feeling, on && { borderColor: color, backgroundColor: colors.surface }]}>
              <Ionicons name={f.icon} size={22} color={on ? color : colors.muted} />
              <Text style={[styles.feelingText, on && { color: colors.text }]}>{f.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      {asksQuestions ? (
        <>
          <Text style={styles.section}>Questões (opcional)</Text>
          <Stepper
            label="Resolvidas"
            value={questions}
            onChange={(v) => {
              setQuestions(v);
              setCorrect((c) => Math.min(c, v));
            }}
          />
          <Stepper label="Acertos" value={correct} max={questions} onChange={setCorrect} />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ marginTop: 10, opacity: logCheckin.isPending ? 0.5 : 1 }}>
        <Chunky
          width="100%"
          height={50}
          radius={14}
          face={color}
          base={shade(color)}
          onPress={logCheckin.isPending ? undefined : save}
          label="Registrar estudo">
          <Text style={[styles.cta, { color: onColor(color) }]}>REGISTRAR ESTUDO</Text>
        </Chunky>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  icon: { width: 52, height: 52, borderRadius: 26, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, marginBottom: 2 },
  title: { color: colors.text, fontFamily: fonts.title, fontSize: 19 },
  section: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginBottom: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.bold, fontSize: 11 },
  stepText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  stepMin: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  linkText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  feelings: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  feeling: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
  },
  feelingText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
  cta: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: 1 },
  doneBadge: { width: 84, height: 84, borderRadius: 42, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 22, marginTop: 14 },
  doneText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
});
