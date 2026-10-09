import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { CheckinSheet, CheckinTarget } from '@/components/checkin-sheet';
import { IconName, SUBJECT_ICON, onColor } from '@/components/subject-style';
import { Card, Kicker, Loading, PressableScale, Screen } from '@/components/ui';
import { CYCLES, subjectById } from '@/data/catalog';
import { ACTIVITY_LABEL, DAY_LETTERS, DAY_NAMES, PERIODS, addDays, dateKey, daysBetween, fromKey, weekdayIndex } from '@/lib/calendar';
import { formatMin } from '@/lib/format';
import { useDismissTask, useProfile, useStats, useStudentState, useWeek } from '@/lib/queries';
import type { ExamDate, Obstacle, Profile, Task } from '@/lib/types';
import { enterFade, enterUp } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const PERIOD_ICON: IconName[] = ['sunny-outline', 'partly-sunny-outline', 'moon-outline'];

// Anti-procrastination nudges, matched to what the student said gets in the way.
const NUDGES: Record<Obstacle | 'default', string> = {
  celular: 'Deixe o celular em outro cômodo durante o bloco. Ele volta para a sua mão no check-in.',
  comeco: 'Não precisa decidir nada: o primeiro passo do seu bloco já está escrito ali embaixo.',
  cansaco: 'Cansado? Faça só o primeiro passo do bloco. Começar é a parte mais difícil.',
  rotina: 'Estudar sempre no mesmo horário transforma esforço em hábito. Seu próximo bloco já está marcado.',
  motivacao: 'Cada bloco feito hoje é uma questão a mais que você acerta no dia da prova.',
  ansiedade: 'Pense só no bloco de hoje, não na prova inteira. Um passo de cada vez.',
  default: 'Comece pelo primeiro bloco do dia. Depois do primeiro, o resto flui.',
};

function taskIcon(t: Task): IconName {
  if (t.activity === 'simulado') return 'document-text';
  if (t.activity === 'revisao') return 'refresh';
  return SUBJECT_ICON[t.subject!];
}
const taskColor = (t: Task) => (t.subject ? subjectById(t.subject).color : colors.gold);

// Início — organização e disciplina do dia
export default function Hoje() {
  const profile = useProfile()!;
  const adjustments = useStudentState().data?.adjustments ?? [];
  const week = useWeek();
  const stats = useStats(7);
  const dismissTask = useDismissTask();

  const [selected, setSelected] = useState(weekdayIndex(new Date()));
  const [checkin, setCheckin] = useState<CheckinTarget | null>(null);
  const [showOverdue, setShowOverdue] = useState(false);

  if (!week.data) return <Loading error={week.isError} onRetry={() => week.refetch()} />;

  // The API freezes today's plan the first time the day is opened; past days keep theirs.
  const { today: todayKey, tasks: weekTasks, overdue, summary } = week.data;
  const today = fromKey(todayKey);
  const monday = addDays(today, -weekdayIndex(today));
  const todayTasks = weekTasks.filter((t) => t.date === todayKey);
  const done = new Set(week.data.done);
  const studied = stats.data?.minutesToday ?? 0;
  const goal = todayTasks.reduce((a, t) => a + t.minutes, 0);
  const days = stats.data?.streak ?? 0;
  const weekDone = weekTasks.filter((t) => done.has(t.id)).length;
  const firstName = profile.name.split(' ')[0];
  const recentAdj = adjustments.find((a) => daysBetween(new Date(a.at), today) <= 3);
  const nextTodo = todayTasks.find((t) => !done.has(t.id));

  const selectedDate = addDays(monday, selected);
  const selectedKey = dateKey(selectedDate);
  const dayTasks = weekTasks.filter((t) => t.date === selectedKey);

  const open = (t: Task) => (t.activity === 'simulado' ? router.push('/questoes') : setCheckin({ task: t }));

  const nudgeKey: Obstacle | 'default' = profile.obstacles.length
    ? profile.obstacles[today.getDate() % profile.obstacles.length]
    : 'default';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Kicker>{today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Kicker>
          <Text style={styles.hello}>Oi, {firstName}</Text>
          <Text style={styles.goal}>{summary.goalLabel}</Text>
        </View>
        <PressableScale scaleTo={0.9} onPress={() => router.push('/perfil')} accessibilityLabel="Abrir perfil" style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
        </PressableScale>
      </View>

      <Countdown profile={profile} dates={summary.examDates} />

      <View style={styles.stats}>
        <Tile icon="flame" color={colors.gold} value={`${days}`} label={days === 1 ? 'dia seguido' : 'dias seguidos'} />
        <View style={[styles.tile, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ring value={goal ? studied / goal : 0} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.tileValue}>{formatMin(studied)}</Text>
            <Text style={styles.tileLabel}>{goal ? `de ${formatMin(goal)} hoje` : 'hoje'}</Text>
          </View>
        </View>
        <Tile icon="checkmark-done" color={colors.accent} value={`${weekDone}/${weekTasks.length}`} label="blocos na semana" />
      </View>

      {nextTodo && studied === 0 ? (
        <Animated.View entering={enterUp()}>
          <Card style={styles.nudge}>
            <View style={styles.nudgeHead}>
              <Ionicons name="rocket" size={16} color={colors.accent} />
              <Text style={styles.nudgeKicker}>Comece pequeno</Text>
            </View>
            <Text style={styles.nudgeText}>{NUDGES[nudgeKey]}</Text>
            <PressableScale scaleTo={0.96} onPress={() => open(nextTodo)} style={styles.nudgeBtn}>
              <Text style={styles.nudgeBtnText}>
                Ver o primeiro passo: {nextTodo.steps[0]?.label}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.accentText} />
            </PressableScale>
          </Card>
        </Animated.View>
      ) : null}

      {recentAdj ? (
        <Card style={styles.coach}>
          <View style={styles.nudgeHead}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={styles.nudgeKicker}>Seu plano foi ajustado</Text>
          </View>
          <Text style={styles.nudgeText}>{recentAdj.text}</Text>
        </Card>
      ) : null}

      {overdue.length ? (
        <Card style={styles.overdue}>
          <PressableScale scaleTo={0.98} onPress={() => setShowOverdue((v) => !v)} style={styles.overdueHead}>
            <Ionicons name="time" size={16} color={colors.gold} />
            <Text style={styles.overdueTitle}>
              {overdue.length} {overdue.length === 1 ? 'bloco pendente' : 'blocos pendentes'} da semana
            </Text>
            <Ionicons name={showOverdue ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
          </PressableScale>
          {showOverdue
            ? overdue.map((t) => (
                <View key={t.id} style={styles.overdueRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={styles.taskMeta}>
                      {DAY_NAMES[t.day]} · {formatMin(t.minutes)}
                    </Text>
                  </View>
                  <PressableScale scaleTo={0.9} onPress={() => open(t)} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Fiz</Text>
                  </PressableScale>
                  <PressableScale scaleTo={0.9} onPress={() => dismissTask.mutate(t.id)} style={[styles.smallBtn, styles.smallGhost]}>
                    <Text style={[styles.smallBtnText, { color: colors.muted }]}>Dispensar</Text>
                  </PressableScale>
                </View>
              ))
            : null}
        </Card>
      ) : null}

      <Text style={styles.section}>Cronograma da semana</Text>
      <View style={styles.strip}>
        {DAY_LETTERS.map((letter, day) => {
          const d = addDays(monday, day);
          const key = dateKey(d);
          const list = weekTasks.filter((t) => t.date === key);
          const all = list.length > 0 && list.every((t) => done.has(t.id));
          const some = list.some((t) => done.has(t.id));
          const on = selected === day;
          const isToday = key === todayKey;
          return (
            <PressableScale
              key={day}
              scaleTo={0.88}
              onPress={() => setSelected(day)}
              accessibilityLabel={`${DAY_NAMES[day]}, ${list.length} blocos`}
              accessibilityState={{ selected: on }}
              style={[styles.dayBtn, on && styles.dayOn, isToday && !on && { borderColor: colors.accentDim }]}>
              <Text style={[styles.dayLetter, on && { color: colors.accentText }]}>{letter}</Text>
              <Text style={[styles.dayNum, on && { color: colors.accentText }]}>{d.getDate()}</Text>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: !list.length ? 'transparent' : all ? colors.accent : some ? colors.gold : colors.line },
                  on && list.length ? { backgroundColor: colors.accentText } : null,
                ]}
              />
            </PressableScale>
          );
        })}
      </View>

      <Animated.View key={selectedKey} entering={enterFade()}>
        <Text style={styles.dayTitle}>
          {selectedKey === todayKey ? 'Hoje' : DAY_NAMES[selected][0].toUpperCase() + DAY_NAMES[selected].slice(1)}
          <Text style={styles.dayTotal}>
            {dayTasks.length ? `  ·  ${formatMin(dayTasks.reduce((a, t) => a + t.minutes, 0))} de estudo` : ''}
          </Text>
        </Text>
        {dayTasks.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
            <Ionicons name="cafe-outline" size={26} color={colors.muted} />
            <Text style={[styles.taskTitle, { marginTop: 8 }]}>Dia de descanso na sua rotina</Text>
            <Text style={styles.taskMeta}>Descansar também faz parte. Quer adiantar? Use o Roadmap ou o Banco de Questões.</Text>
          </Card>
        ) : (
          [0, 1, 2]
            .filter((p) => dayTasks.some((t) => t.period === p))
            .map((p) => (
              <View key={p} style={{ marginBottom: 6 }}>
                <View style={styles.periodHead}>
                  <Ionicons name={PERIOD_ICON[p]} size={14} color={colors.muted} />
                  <Text style={styles.periodText}>{PERIODS[p]}</Text>
                </View>
                {dayTasks
                  .filter((t) => t.period === p)
                  .map((t) => (
                    <TaskCard key={t.id} task={t} done={done.has(t.id)} onPress={() => open(t)} />
                  ))}
              </View>
            ))
        )}
      </Animated.View>

      <CheckinSheet target={checkin} onClose={() => setCheckin(null)} />
    </Screen>
  );
}

function TaskCard({ task, done, onPress }: { task: Task; done: boolean; onPress: () => void }) {
  const color = taskColor(task);
  return (
    <PressableScale scaleTo={0.97} onPress={onPress} style={[styles.task, done && { opacity: 0.6 }]}>
      <View style={[styles.taskIcon, { backgroundColor: color }]}>
        <Ionicons name={taskIcon(task)} size={18} color={onColor(color)} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.taskTitle, done && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={styles.taskMeta} numberOfLines={1}>
          {task.subject ? `${subjectById(task.subject).name} · ` : ''}
          {ACTIVITY_LABEL[task.activity]} · {formatMin(task.minutes)}
        </Text>
      </View>
      <View style={[styles.check, done && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        {done ? <Ionicons name="checkmark" size={14} color={colors.accentText} /> : null}
      </View>
    </PressableScale>
  );
}

function Countdown({ profile, dates: upcoming }: { profile: Profile; dates: ExamDate[] }) {
  const dates = upcoming.map((d) => ({ exam: { id: d.examId, name: d.examName }, phase: d.phase, date: fromKey(d.date) }));
  if (profile.cycle !== CYCLES[0] || !dates.length) {
    return (
      <Card style={styles.countdown}>
        <Text style={styles.countLabel}>
          {profile.cycle !== CYCLES[0] ? `Provas de ${profile.cycle}` : 'Suas provas'}
        </Text>
        <Text style={styles.countSmall}>
          {profile.cycle !== CYCLES[0]
            ? 'As datas oficiais ainda não foram divulgadas. A contagem aparece aqui assim que saírem.'
            : 'Nenhuma prova futura nas datas oficiais que acompanhamos.'}
        </Text>
      </Card>
    );
  }
  const next = dates[0];
  const left = daysBetween(new Date(), next.date);
  const others = dates.slice(1).filter((d, i, a) => a.findIndex((x) => x.exam.id === d.exam.id) === i && d.exam.id !== next.exam.id);
  return (
    <Card style={styles.countdown}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={styles.countBig}>
          <Text style={styles.countNum}>{left}</Text>
          <Text style={styles.countUnit}>{left === 1 ? 'dia' : 'dias'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.countLabel}>{left === 0 ? 'É hoje!' : 'até a próxima prova'}</Text>
          <Text style={styles.countExam}>
            {next.exam.name} · {next.phase}
          </Text>
          <Text style={styles.countSmall}>
            {next.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </View>
      {others.length ? (
        <View style={styles.otherRow}>
          {others.slice(0, 3).map((d) => (
            <View key={d.exam.id} style={styles.otherChip}>
              <Text style={styles.otherText}>
                {d.exam.name.split(' ')[0]} · {d.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
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

function Ring({ value }: { value: number }) {
  const size = 38;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
      {v > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  hello: { color: colors.text, fontFamily: fonts.title, fontSize: 26 },
  goal: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 17 },
  countdown: { backgroundColor: colors.surface, borderColor: colors.accentDim },
  countBig: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    borderBottomColor: colors.accentDim,
  },
  countNum: { color: colors.accentText, fontFamily: fonts.titleBold, fontSize: 30, lineHeight: 34 },
  countUnit: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 11 },
  countLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  countExam: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, marginTop: 2 },
  countSmall: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2, lineHeight: 17 },
  otherRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  otherChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  otherText: { color: colors.text, fontFamily: fonts.medium, fontSize: 11 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 10,
    gap: 2,
  },
  tileValue: { color: colors.text, fontFamily: fonts.title, fontSize: 18 },
  tileLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  nudge: { borderColor: colors.accentDim, backgroundColor: colors.accentSoft },
  nudgeHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  nudgeKicker: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 12 },
  nudgeText: { color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    maxWidth: '100%',
  },
  nudgeBtnText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 12, flexShrink: 1 },
  coach: { borderColor: colors.accentDim },
  overdue: { borderColor: colors.goldDim, gap: 10 },
  overdueHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overdueTitle: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  smallGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  smallBtnText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 12 },
  section: { color: colors.text, fontFamily: fonts.title, fontSize: 18, marginTop: 8, marginBottom: 10 },
  strip: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    gap: 2,
  },
  dayOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayLetter: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11 },
  dayNum: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  dayTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, marginBottom: 10 },
  dayTotal: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  periodHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  periodText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  taskIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  taskMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2, textAlign: 'left' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
