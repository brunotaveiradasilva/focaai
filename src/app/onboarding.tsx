import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { DayTimes, WeekActivities } from '@/components/routine-editor';
import { IconName, SUBJECT_ICON } from '@/components/subject-style';
import { Button, Card, Dots, Kicker, Pill, PillRow, PressableScale, Screen, Sub, Title } from '@/components/ui';
import {
  COURSES,
  CYCLES,
  EXAM_CALENDAR,
  ExamTrack,
  SUBJECTS,
  SubjectId,
  TIERS,
  VESTIBULARES,
  courseById,
  subjectById,
} from '@/data/catalog';
import { DAYS, fromKey } from '@/lib/calendar';
import { formatMin } from '@/lib/format';
import { usePlanPreview, useSaveProfile } from '@/lib/queries';
import { DEFAULT_ROUTINE, MIN_FREE, Routine } from '@/lib/routine';
import type { ExamDate, Level, Obstacle, PlanPreview, Profile, Stage } from '@/lib/types';
import { enterStep } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const TOTAL = 9;

// Study periods aren't asked in the onboarding: weekday nights and the weekend. Rows are
// morning, afternoon and night, Monday to Sunday.
const DEFAULT_WEEK = [
  false, false, false, false, false, true, false,
  false, false, false, false, false, true, true,
  true, true, true, true, true, false, false,
];

const TRACKS: { id: ExamTrack; title: string; desc: string; icon: IconName }[] = [
  { id: 'enem', title: 'ENEM', desc: 'SISU, ProUni e FIES. Uma prova, vagas no país inteiro.', icon: 'school' },
  { id: 'vestibulares', title: 'Vestibulares', desc: 'Provas próprias como Fuvest, Unicamp, Unesp e UFMS.', icon: 'business' },
  { id: 'ambos', title: 'ENEM + vestibulares', desc: 'O caminho mais comum: mais chances, mesmo estudo de base.', icon: 'git-merge' },
];

const STAGES: { id: Stage; label: string }[] = [
  { id: 'em1', label: '1º ano do EM' },
  { id: 'em2', label: '2º ano do EM' },
  { id: 'em3', label: '3º ano do EM' },
  { id: 'formado', label: 'Já terminei o EM' },
  { id: 'cursinho', label: 'Faço cursinho' },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: 1, label: 'Difícil' },
  { value: 2, label: 'Razoável' },
  { value: 3, label: 'Domino' },
];

const OBSTACLES: { id: Obstacle; label: string; icon: IconName }[] = [
  { id: 'celular', label: 'Celular e redes sociais', icon: 'phone-portrait-outline' },
  { id: 'rotina', label: 'Não tenho rotina fixa', icon: 'calendar-outline' },
  { id: 'comeco', label: 'Não sei por onde começar', icon: 'compass-outline' },
  { id: 'cansaco', label: 'Chego cansado para estudar', icon: 'battery-dead-outline' },
  { id: 'motivacao', label: 'Perco a motivação no meio', icon: 'trending-down-outline' },
  { id: 'ansiedade', label: 'Ansiedade com a prova', icon: 'pulse-outline' },
];

// Catch-all options: they aren't in any vestibular's course list, and that's expected.
const GENERIC_COURSES = ['outro', 'engenharias'];

/** Lowercase and without accents, so "musica" finds "Música". */
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ç/g, 'c');

/** The chosen vestibulares whose 2027 course list doesn't have this course. */
function missingIn(courseId: string, vestibulares: string[]) {
  if (GENERIC_COURSES.includes(courseId)) return [];
  return VESTIBULARES.filter((v) => vestibulares.includes(v.id) && v.courses && !v.courses.includes(courseId)).map((v) => v.name);
}

/** The default periods, unless the fixed week leaves none of them free: then every period it leaves free. */
function studyWeek(preview: PlanPreview | undefined) {
  const free = (i: number) => (preview?.free?.[i % 7]?.[Math.floor(i / 7)] ?? MIN_FREE) >= MIN_FREE;
  return DEFAULT_WEEK.some((on, i) => on && free(i)) ? DEFAULT_WEEK : DEFAULT_WEEK.map((_, i) => free(i));
}

const shortDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

export default function Onboarding() {
  const saveProfile = useSaveProfile();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [track, setTrack] = useState<ExamTrack>('ambos');
  const [cycle, setCycle] = useState(CYCLES[0]);
  const [vestibulares, setVestibulares] = useState<string[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('em3');
  const [firstAttempt, setFirstAttempt] = useState(true);
  const [language, setLanguage] = useState<'ingles' | 'espanhol'>('ingles');
  const [levels, setLevels] = useState<Record<SubjectId, Level>>(
    () => Object.fromEntries(SUBJECTS.map((s) => [s.id, 2])) as Record<SubjectId, Level>,
  );
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [routine, setRoutine] = useState<Routine>(DEFAULT_ROUTINE);

  const needsVest = track !== 'enem';
  const draft: Profile = useMemo(
    () => ({
      name: name.trim() || 'Estudante',
      track,
      cycle,
      vestibulares: needsVest ? vestibulares : [],
      courseId: courseId ?? 'outro',
      stage,
      firstAttempt,
      language,
      levels,
      week: DEFAULT_WEEK,
      minutesPerDay: 180,
      sessionMin: 90,
      routine,
      obstacles,
      createdAt: new Date().toISOString(),
    }),
    [name, track, cycle, needsVest, vestibulares, courseId, stage, firstAttempt, language, levels, routine, obstacles],
  );

  // The API works out the plan this draft would get: free time per period, weekly minutes, exams.
  const preview = usePlanPreview(draft).data;
  const canNext =
    (step !== 0 || name.trim().length > 0) &&
    (step !== 1 || !needsVest || vestibulares.length > 0) &&
    (step !== 2 || !!courseId);

  const next = async () => {
    if (step < TOTAL - 1) return setStep(step + 1);
    setSaveError(null);
    try {
      await saveProfile.mutateAsync({ ...draft, week: studyWeek(preview), createdAt: new Date().toISOString() });
      router.replace('/hoje');
    } catch {
      setSaveError('Não deu para salvar agora. Confira sua internet e tente de novo.');
    }
  };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Screen
      footer={
        <>
          <Button label="Voltar" variant="ghost" onPress={() => (step === 0 ? router.back() : setStep(step - 1))} />
          <Button
            label={step === TOTAL - 1 ? 'Começar meus estudos' : 'Continuar'}
            onPress={next}
            disabled={!canNext || saveProfile.isPending}
          />
        </>
      }>
      <Dots total={TOTAL} current={step} />
      {/* Keyed by step so each question slides in. */}
      <Animated.View key={step} entering={enterStep()}>
        {step === 0 && (
          <>
            <Kicker>Vamos montar sua preparação</Kicker>
            <Title>Como podemos te chamar?</Title>
            <Sub>São 9 perguntas rápidas. Quanto mais sincero, mais o plano fica com a sua cara.</Sub>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="words"
            />
          </>
        )}

        {step === 1 && (
          <>
            <Kicker>{step + 1} de {TOTAL} · Objetivo</Kicker>
            <Title>Qual prova você vai fazer?</Title>
            <Sub>Usamos as datas oficiais para contar os dias e organizar a reta final.</Sub>
            <View style={{ gap: 10, marginBottom: 18 }}>
              {TRACKS.map((t) => (
                <OptionCard key={t.id} icon={t.icon} title={t.title} desc={t.desc} selected={track === t.id} onPress={() => setTrack(t.id)} />
              ))}
            </View>
            <Text style={styles.label}>Quando você presta?</Text>
            <PillRow>
              {CYCLES.map((y) => (
                <Pill key={y} label={y === CYCLES[0] ? `Este ano (${y})` : `Ano que vem (${y})`} selected={cycle === y} onPress={() => setCycle(y)} />
              ))}
            </PillRow>
            {needsVest ? (
              <>
                <Text style={styles.label}>Quais vestibulares?</Text>
                <View style={{ gap: 8, marginBottom: 8 }}>
                  {VESTIBULARES.map((v) => {
                    const ev = EXAM_CALENDAR.find((e) => e.id === v.id && e.cycle === cycle);
                    const first = ev?.phases[0];
                    return (
                      <CheckRow
                        key={v.id}
                        label={v.name}
                        hint={first ? `${first.label}: ${first.dates.map((d) => shortDate(new Date(`${d}T12:00:00`))).join(' e ')}` : 'Data oficial ainda não divulgada'}
                        checked={vestibulares.includes(v.id)}
                        onPress={() => setVestibulares(toggle(vestibulares, v.id))}
                      />
                    );
                  })}
                </View>
                <Text style={styles.hint}>O seu não está na lista? Marque o mais parecido: o plano de estudo funciona igual.</Text>
              </>
            ) : null}
            <ExamPreview profile={draft} dates={preview?.summary.examDates ?? []} />
          </>
        )}

        {step === 2 && (
          <>
            <Kicker>{step + 1} de {TOTAL} · Curso</Kicker>
            <Title>Qual curso você quer?</Title>
            <Sub>Não precisa escolher faculdade. A concorrência do curso é o que define a intensidade do seu plano.</Sub>
            {courseId ? (
              <Card style={{ borderColor: colors.accentDim, marginBottom: 12 }}>
                <Text style={styles.cardTitle}>
                  {courseById(courseId).name} · concorrência {TIERS[courseById(courseId).tier].label.toLowerCase()}
                </Text>
                <Text style={styles.cardText}>{TIERS[courseById(courseId).tier].desc}</Text>
                {missingIn(courseId, draft.vestibulares).length ? (
                  <Text style={[styles.hint, { marginTop: 6, color: colors.gold }]}>
                    Não aparece na lista de cursos de {missingIn(courseId, draft.vestibulares).join(', ')}.
                  </Text>
                ) : null}
                <Text style={[styles.hint, { marginTop: 6 }]}>Faixa aproximada, com base em como as notas de corte do SISU costumam ordenar os cursos.</Text>
              </Card>
            ) : null}
            <CoursePicker value={courseId} onChange={setCourseId} vestibulares={draft.vestibulares} />
          </>
        )}

        {step === 3 && (
          <>
            <Kicker>{step + 1} de {TOTAL} · Momento</Kicker>
            <Title>Em que momento você está?</Title>
            <Sub>Isso ajusta o ritmo: quem está no 3º ano tem menos tempo livre do que quem só faz cursinho.</Sub>
            <PillRow>
              {STAGES.map((s) => (
                <Pill key={s.id} label={s.label} selected={stage === s.id} onPress={() => setStage(s.id)} />
              ))}
            </PillRow>
            <Text style={styles.label}>Já prestou ENEM ou vestibular antes?</Text>
            <PillRow>
              <Pill label="Vai ser a primeira vez" selected={firstAttempt} onPress={() => setFirstAttempt(true)} />
              <Pill label="Já prestei" selected={!firstAttempt} onPress={() => setFirstAttempt(false)} />
            </PillRow>
            <Text style={styles.label}>Língua estrangeira</Text>
            <PillRow>
              <Pill label="Inglês" selected={language === 'ingles'} onPress={() => setLanguage('ingles')} />
              <Pill label="Espanhol" selected={language === 'espanhol'} onPress={() => setLanguage('espanhol')} />
            </PillRow>
          </>
        )}

        {step === 4 && (
          <>
            <Kicker>{step + 1} de {TOTAL} · Nível</Kicker>
            <Title>Como você está em cada matéria?</Title>
            <Sub>Matérias difíceis ganham mais espaço; as que você domina começam mais adiantadas no roadmap.</Sub>
            <View style={{ gap: 8 }}>
              {SUBJECTS.map((s) => (
                <View key={s.id} style={styles.levelRow}>
                  <View style={[styles.levelIcon, { backgroundColor: s.color }]}>
                    <Ionicons name={SUBJECT_ICON[s.id]} size={14} color={colors.ink} />
                  </View>
                  <Text style={styles.levelName}>{s.name}</Text>
                  <View style={styles.segment}>
                    {LEVELS.map((l) => {
                      const on = levels[s.id] === l.value;
                      return (
                        <Pressable
                          key={l.value}
                          accessibilityRole="button"
                          accessibilityLabel={`${s.name}: ${l.label}`}
                          accessibilityState={{ selected: on }}
                          onPress={() => setLevels({ ...levels, [s.id]: l.value })}
                          style={[styles.segBtn, on && { backgroundColor: l.value === 1 ? colors.danger : l.value === 3 ? colors.accent : colors.line }]}>
                          <Text style={[styles.segText, on && { color: l.value === 2 ? colors.text : colors.ink }]}>{l.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {step === 5 && (
          <>
            <Kicker>{step + 1} de {TOTAL} · Rotina</Kicker>
            <Title>Como é o seu dia?</Title>
            <Sub>Digite os horários ou toque numa sugestão. O plano não marca estudo fora desse intervalo nem no almoço.</Sub>
            <DayTimes value={routine} onChange={setRoutine} suggestions />
          </>
        )}

        {step === 6 && (
          <>
            <Kicker>{step + 1} de {TOTAL} · Semana</Kicker>
            <Title>Conte como é a sua semana</Title>
            <Sub>
              Cadastre escola, trabalho, inglês, esporte, hobbies e tudo que se repete. Assim o plano encaixa o estudo no tempo
              que sobra. Dá para mudar depois em Ajustes.
            </Sub>
            <WeekActivities value={routine} onChange={setRoutine} free={preview?.free} />
          </>
        )}

        {step === 7 && (
          <>
            <Kicker>{step + 1} de {TOTAL} · Disciplina</Kicker>
            <Title>O que mais te atrapalha?</Title>
            <Sub>Sem julgamento. O FocaAI usa isso para te ajudar a não procrastinar.</Sub>
            <View style={{ gap: 8 }}>
              {OBSTACLES.map((o) => (
                <CheckRow
                  key={o.id}
                  icon={o.icon}
                  label={o.label}
                  checked={obstacles.includes(o.id)}
                  onPress={() => setObstacles(toggle(obstacles, o.id))}
                />
              ))}
            </View>
          </>
        )}

        {step === 8 && <PlanSummary profile={draft} preview={preview} />}
        {saveError ? <Text style={[styles.hint, { color: colors.danger, marginTop: 10 }]}>{saveError}</Text> : null}
      </Animated.View>
    </Screen>
  );
}

function OptionCard({ icon, title, desc, selected, onPress }: { icon: IconName; title: string; desc: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.option, selected && styles.optionOn]}>
      <View style={[styles.optionIcon, selected && { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={20} color={selected ? colors.accentText : colors.muted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{desc}</Text>
      </View>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.accent : colors.line} />
    </PressableScale>
  );
}

// Every course in one list, filtered by name as the student types. Each row says which of the
// chosen vestibulares offer it.
function CoursePicker({ value, onChange, vestibulares }: { value: string | null; onChange: (id: string) => void; vestibulares: string[] }) {
  const [query, setQuery] = useState('');
  const q = fold(query.trim());
  const found = q ? COURSES.filter((c) => fold(c.name).includes(q)) : COURSES;
  // "Outro curso / ainda não sei" is always there, so a search never leaves the student stuck.
  const other = COURSES[COURSES.length - 1];
  const list = found.includes(other) ? found : [...found, other];
  const chosen = VESTIBULARES.filter((v) => vestibulares.includes(v.id) && v.courses);

  return (
    <>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Digite o nome do curso"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="Limpar busca" hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {q && found.length === 0 ? (
        <Text style={[styles.hint, { marginBottom: 8 }]}>Nenhum curso com esse nome. Escolha o mais parecido ou “Outro curso”.</Text>
      ) : null}
      <View style={styles.courseList}>
        {list.map((c, i) => {
          const on = value === c.id;
          const offeredBy = chosen.filter((v) => v.courses!.includes(c.id)).map((v) => v.name);
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.courseRow, i > 0 && styles.courseDivider, on && styles.courseRowOn]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.courseName, on && { color: colors.accent }]}>{c.name}</Text>
                <Text style={styles.hint}>
                  Concorrência {TIERS[c.tier].label.toLowerCase()}
                  {offeredBy.length ? ` · ${offeredBy.join(', ')}` : ''}
                </Text>
              </View>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.accent : colors.line} />
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function CheckRow({ label, hint, icon, checked, onPress }: { label: string; hint?: string; icon?: IconName; checked: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.check, checked && styles.optionOn]}>
      {icon ? <Ionicons name={icon} size={18} color={checked ? colors.accent : colors.muted} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.checkLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? colors.accent : colors.line} />
    </PressableScale>
  );
}

function ExamPreview({ profile, dates: upcoming }: { profile: Profile; dates: ExamDate[] }) {
  const dates = upcoming.map((d) => ({ exam: { id: d.examId, name: d.examName }, phase: d.phase, date: fromKey(d.date) }));
  if (profile.cycle !== CYCLES[0]) {
    return (
      <Card style={{ marginTop: 12 }}>
        <Text style={styles.cardTitle}>Provas de {profile.cycle}</Text>
        <Text style={styles.cardText}>
          As datas oficiais ainda não foram divulgadas. Assim que saírem, a contagem regressiva aparece no app.
        </Text>
      </Card>
    );
  }
  if (!dates.length) return null;
  return (
    <Card style={{ marginTop: 12, gap: 6 }}>
      <Text style={styles.cardTitle}>Suas próximas provas</Text>
      {dates.slice(0, 5).map((d) => (
        <View key={`${d.exam.id}-${d.date.toISOString()}`} style={styles.examRow}>
          <Text style={styles.examName}>
            {d.exam.name} · {d.phase}
          </Text>
          <Text style={styles.examDate}>{d.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</Text>
        </View>
      ))}
    </Card>
  );
}

function PlanSummary({ profile, preview }: { profile: Profile; preview: PlanPreview | undefined }) {
  const tasks = preview?.tasks ?? [];
  const course = courseById(profile.courseId);
  const tier = TIERS[course.tier];
  const weak = SUBJECTS.filter((s) => profile.levels[s.id] === 1);
  const priority = [...new Set([...weak.map((s) => s.id), ...course.focus])].slice(0, 4);
  return (
    <>
      <Kicker>Pronto</Kicker>
      <Title>Sua preparação está montada</Title>
      <Sub>Feita com a sua rotina, a concorrência de {course.name} e o seu nível em cada matéria.</Sub>
      <View style={styles.stats}>
        <Stat value={preview ? formatMin(preview.summary.weeklyMinutes) : '…'} label="por semana" />
        <Stat value={String(tasks.length)} label="blocos na semana" />
        <Stat value={`${tier.simuladosPerMonth}`} label="simulados por mês" />
        <Stat value={`${tier.redacoesPerWeek}`} label={tier.redacoesPerWeek === 1 ? 'redação por semana' : 'redações por semana'} />
      </View>
      {priority.length ? (
        <Card>
          <Text style={styles.cardTitle}>Prioridades</Text>
          <View style={styles.prioRow}>
            {priority.map((id) => (
              <View key={id} style={[styles.prio, { borderColor: subjectById(id).color }]}>
                <Ionicons name={SUBJECT_ICON[id]} size={13} color={subjectById(id).color} />
                <Text style={styles.prioText}>{subjectById(id).name}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
      <Card style={{ gap: 8 }}>
        <Text style={styles.cardTitle}>Sua semana</Text>
        {DAYS.map((d, day) => {
          const list = tasks.filter((t) => t.day === day);
          return (
            <View key={d} style={styles.weekRow}>
              <Text style={styles.weekDay}>{d}</Text>
              <View style={styles.weekBlocks}>
                {list.length ? (
                  list.map((t) => (
                    <View key={t.id} style={[styles.weekChip, { backgroundColor: t.subject ? subjectById(t.subject).color : colors.gold }]}>
                      <Text style={styles.weekChipText} numberOfLines={1}>
                        {t.subject ? subjectById(t.subject).short : t.activity === 'simulado' ? 'Simulado' : 'Revisão'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.hint}>Descanso</Text>
                )}
              </View>
            </View>
          );
        })}
      </Card>
    </>
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
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginBottom: 8 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.text, fontFamily: fonts.body, fontSize: 16 },
  courseList: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface2, overflow: 'hidden' },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  courseDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  courseRowOn: { backgroundColor: colors.accentSoft },
  courseName: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  cardTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  cardText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  optionDesc: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  checkLabel: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  examRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  examName: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 13 },
  examDate: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 13 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  levelName: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  segment: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: 2 },
  segBtn: { paddingVertical: 6, paddingHorizontal: 9, borderRadius: 8 },
  segText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
  },
  statValue: { color: colors.text, fontFamily: fonts.title, fontSize: 22 },
  statLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  prioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  prio: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  prioText: { color: colors.text, fontFamily: fonts.medium, fontSize: 12 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekDay: { width: 32, color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
  weekBlocks: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  weekChip: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7 },
  weekChipText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 11 },
});
