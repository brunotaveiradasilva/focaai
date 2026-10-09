// Rule-based study plan. Deterministic and explainable: every block comes from the
// onboarding answers (routine, course competition, self-rated levels) plus what the
// student logs, so the same inputs always produce the same week.
import {
  EXAM_CALENDAR,
  ExamEvent,
  SUBJECTS,
  SubjectId,
  TIERS,
  TRACK_LABEL,
  RoadTopic,
  Topic,
  courseById,
  isMinor,
  roadmap,
} from '@/data/catalog';
import { freeMinutes } from '@/lib/routine';
import type { Profile } from '@/store/app';

export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const DAY_NAMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
export const DAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
export const PERIODS = ['Manhã', 'Tarde', 'Noite'];

export type Activity = 'teoria' | 'exercicios' | 'redacao' | 'revisao' | 'simulado';

export const ACTIVITY_LABEL: Record<Activity, string> = {
  teoria: 'Teoria + questões',
  exercicios: 'Bateria de questões',
  redacao: 'Redação',
  revisao: 'Revisão da semana',
  simulado: 'Simulado',
};

export type Step = { label: string; minutes: number };

export type Task = {
  id: string;
  date: string;
  day: number;
  period: number;
  activity: Activity;
  subject?: SubjectId;
  topicId?: string;
  title: string;
  minutes: number;
  steps: Step[];
};

type Progress = Record<string, number>;
type Focus = Partial<Record<SubjectId, string>>;
type Boost = Partial<Record<SubjectId, number>>;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (key: string) => new Date(`${key}T12:00:00`);
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const startOfWeek = (d: Date) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12), -weekdayIndex(d));
const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
export const daysBetween = (from: Date, to: Date) => dayNumber(to) - dayNumber(from);

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export function followedExams(profile: Profile): ExamEvent[] {
  return EXAM_CALENDAR.filter(
    (e) =>
      e.cycle === profile.cycle &&
      ((e.kind === 'enem' && profile.track !== 'vestibulares') ||
        (e.kind === 'vestibular' && profile.track !== 'enem' && profile.vestibulares.includes(e.id))),
  );
}

export type ExamDate = { exam: ExamEvent; phase: string; date: Date };

// Every upcoming exam day the student follows, soonest first.
export function upcomingExamDates(profile: Profile, from = new Date()): ExamDate[] {
  return followedExams(profile)
    .flatMap((exam) =>
      exam.phases.flatMap((p) => p.dates.map((d) => ({ exam, phase: p.label, date: fromKey(d) }))),
    )
    .filter((x) => daysBetween(from, x.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function goalLabel(profile: Profile) {
  return `${TRACK_LABEL[profile.track]} ${profile.cycle} · ${courseById(profile.courseId).name}`;
}

// ---------------------------------------------------------------------------
// Subjects and topics
// ---------------------------------------------------------------------------

export function subjectWeights(profile: Profile, boost: Boost) {
  const course = courseById(profile.courseId);
  const w: Partial<Record<SubjectId, number>> = {};
  for (const s of SUBJECTS) {
    // Redação gets its own weekly blocks, sized by competition, instead of rotating.
    if (s.id === 'red') continue;
    const level = profile.levels[s.id];
    w[s.id] =
      1 + (level === 1 ? 1.5 : level === 3 ? -0.4 : 0) + (course.focus.includes(s.id) ? 1 : 0) + (boost[s.id] ?? 0);
  }
  return w;
}

// Exams whose editais shape the roadmap, regardless of cycle (the calendar may not list the
// student's cycle yet). Nothing chosen falls back to ENEM.
export function examIdsOf(profile: Pick<Profile, 'track' | 'vestibulares'>): string[] {
  const ids = [
    ...(profile.track !== 'vestibulares' ? ['enem'] : []),
    ...(profile.track !== 'enem' ? profile.vestibulares : []),
  ];
  return ids.length ? ids : ['enem'];
}

// The student's chosen focus wins; otherwise keep going with what they started, otherwise
// the first unfinished topic their editais cite explicitly, then the ones cited in part.
export function currentTopic(subject: SubjectId, progress: Progress, focus: Focus, examIds: string[]): RoadTopic {
  const done = (t: Topic) => (progress[t.id] ?? 0) >= t.lessons;
  const road = roadmap(subject, examIds);
  const f = road.find((t) => t.id === focus[subject]);
  if (f && !done(f)) return f;
  const content = road.filter((t) => !t.final);
  return (
    content.find((t) => (progress[t.id] ?? 0) > 0 && !done(t)) ??
    content.find((t) => !isMinor(t) && !done(t)) ??
    content.find((t) => !done(t)) ??
    road[road.length - 1]
  );
}

export type TopicState = 'done' | 'doing' | 'todo';

export function topicState(topic: Topic, progress: Progress): TopicState {
  const done = progress[topic.id] ?? 0;
  if (done >= topic.lessons) return 'done';
  return done > 0 ? 'doing' : 'todo';
}

// Smooth weighted round-robin: deterministic and spreads heavy subjects across the week.
function rotation(weights: Partial<Record<SubjectId, number>>, n: number, seed: number): SubjectId[] {
  const ids = Object.keys(weights) as SubjectId[];
  const w = (k: SubjectId) => Math.max(0.2, weights[k] ?? 0);
  const total = ids.reduce((a, k) => a + w(k), 0);
  const current: Record<string, number> = {};
  // Seeding with the week number varies which subject opens each week.
  ids.forEach((k, i) => (current[k] = ((i + seed) % ids.length) * 0.01));
  const out: SubjectId[] = [];
  for (let i = 0; i < n; i++) {
    let best = ids[0];
    for (const k of ids) {
      current[k] += w(k);
      if (current[k] > current[best]) best = k;
    }
    current[best] -= total;
    out.push(best);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Steps: what to actually do inside each block
// ---------------------------------------------------------------------------

const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
// ENEM gives about 3 minutes per question.
const questionsFor = (minutes: number) => Math.max(5, Math.round(minutes / 3));

function stepsFor(activity: Activity, minutes: number, topic: string | undefined, questionShare: number): Step[] {
  switch (activity) {
    case 'teoria': {
      const fix = r5(minutes * 0.1);
      const q = r5(minutes * questionShare * 0.6);
      return [
        { label: `Aula ou leitura: ${topic}`, minutes: minutes - q - fix },
        { label: `${questionsFor(q)} questões de fixação`, minutes: q },
        { label: 'Anotar dúvidas e erros', minutes: fix },
      ];
    }
    case 'exercicios': {
      const warm = r5(minutes * 0.15);
      const fix = r5(minutes * 0.15);
      const q = minutes - warm - fix;
      return [
        { label: `Revisar o resumo de ${topic}`, minutes: warm },
        { label: `${questionsFor(q)} questões de ${topic}`, minutes: q },
        { label: 'Corrigir e entender cada erro', minutes: fix },
      ];
    }
    case 'redacao':
      return minutes >= 75
        ? [
            { label: 'Ler a proposta e planejar tese e argumentos', minutes: 15 },
            { label: 'Escrever a redação completa', minutes: minutes - 30 },
            { label: 'Revisar pelas 5 competências do ENEM', minutes: 15 },
          ]
        : [
            { label: 'Ler a proposta e planejar tese e argumentos', minutes: r5(minutes * 0.3) },
            { label: 'Escrever introdução e um desenvolvimento', minutes: minutes - r5(minutes * 0.3) },
          ];
    case 'revisao':
      return [
        { label: 'Reler anotações e erros da semana', minutes: r5(minutes * 0.4) },
        { label: 'Refazer as questões que você errou', minutes: r5(minutes * 0.4) },
        { label: 'Conferir o plano da próxima semana', minutes: minutes - 2 * r5(minutes * 0.4) },
      ];
    case 'simulado': {
      const check = r5(minutes * 0.15);
      return [
        { label: `Simulado de ${questionsFor(minutes - check)} questões no Banco de Questões`, minutes: minutes - check },
        { label: 'Conferir o resultado e anotar os erros', minutes: check },
      ];
    }
  }
}

// ---------------------------------------------------------------------------
// The week
// ---------------------------------------------------------------------------

type Block = { day: number; period: number; k: number; minutes: number };

// Shortest stretch worth a study block.
const MIN_BLOCK = 30;

function blocksOf(profile: Profile): Block[] {
  const blocks: Block[] = [];
  const { routine } = profile;
  for (let day = 0; day < 7; day++) {
    // A marked period only counts if the fixed routine leaves room in it.
    const free = (p: number) => (routine ? freeMinutes(routine, day, p) : Infinity);
    const periods = [0, 1, 2].filter((p) => profile.week[p * 7 + day] && free(p) >= MIN_BLOCK);
    if (!periods.length) continue;
    for (const period of periods) {
      const perPeriod = Math.min(profile.minutesPerDay / periods.length, free(period));
      const n = Math.max(1, Math.round(perPeriod / profile.sessionMin));
      const minutes = Math.max(30, r5(perPeriod / n));
      for (let k = 0; k < n; k++) blocks.push({ day, period, k, minutes });
    }
  }
  return blocks;
}

// Spread `count` picks evenly across `n` slots.
const spread = (n: number, count: number) =>
  Array.from({ length: Math.min(n, count) }, (_, i) => Math.floor(((i + 0.5) * n) / Math.min(n, count)));

export function weekPlan(
  profile: Profile,
  progress: Progress,
  focus: Focus,
  boost: Boost,
  anyDayOfWeek: Date,
): Task[] {
  const monday = startOfWeek(anyDayOfWeek);
  const weekNo = Math.floor(dayNumber(monday) / 7);
  const tier = TIERS[courseById(profile.courseId).tier];
  const examIds = examIdsOf(profile);
  const blocks = blocksOf(profile);
  if (!blocks.length) return [];

  const kind: (Activity | null)[] = blocks.map(() => null);
  const firstOn = (day: number) => blocks.findIndex((b) => b.day === day);
  const lastDayIdx = blocks.length - 1;

  // Simulado on Saturday (or the last study day), weekly or every other week by competition.
  if (tier.simuladosPerMonth >= 4 || weekNo % 2 === 0) {
    const i = firstOn(5) >= 0 ? firstOn(5) : blocks.findIndex((b) => b.day === blocks[lastDayIdx].day);
    if (blocks.length >= 3) kind[i] = 'simulado';
  }
  // Weekly review on Sunday when the student studies then.
  const sun = firstOn(6);
  if (sun >= 0 && kind[sun] === null && blocks.length >= 4) kind[sun] = 'revisao';
  // Essays spread through the week.
  const free = () => kind.map((k, i) => (k === null ? i : -1)).filter((i) => i >= 0);
  const f = free();
  for (const pos of spread(f.length, tier.redacoesPerWeek)) if (f.length > 3) kind[f[pos]] = 'redacao';

  const studyIdx = free();
  const subjects = rotation(subjectWeights(profile, boost), studyIdx.length, weekNo);
  const seen: Partial<Record<SubjectId, number>> = {};
  const assigned: Record<number, SubjectId> = {};
  studyIdx.forEach((bi, n) => (assigned[bi] = subjects[n]));

  return blocks.map((b, i) => {
    const date = dateKey(addDays(monday, b.day));
    const id = `${date}-${b.period}-${b.k}`;
    const base = { id, date, day: b.day, period: b.period, minutes: b.minutes };
    const act = kind[i];
    if (act === 'simulado' || act === 'revisao') {
      return { ...base, activity: act, title: ACTIVITY_LABEL[act], steps: stepsFor(act, b.minutes, undefined, tier.questionShare) };
    }
    if (act === 'redacao') {
      return {
        ...base,
        activity: act,
        subject: 'red' as SubjectId,
        title: 'Redação com tema de prova anterior',
        steps: stepsFor(act, b.minutes, undefined, tier.questionShare),
      };
    }
    const subject = assigned[i];
    const topic = currentTopic(subject, progress, focus, examIds);
    const nth = (seen[subject] = (seen[subject] ?? 0) + 1);
    // New topics start with theory; after that, every other block is pure practice.
    const activity: Activity = (progress[topic.id] ?? 0) === 0 && nth === 1 ? 'teoria' : nth % 2 === 0 ? 'exercicios' : 'teoria';
    return {
      ...base,
      activity,
      subject,
      topicId: topic.id,
      title: topic.title,
      steps: stepsFor(activity, b.minutes, topic.title, tier.questionShare),
    };
  });
}

export function tasksFor(
  date: Date,
  profile: Profile,
  progress: Progress,
  focus: Focus,
  boost: Boost,
): Task[] {
  const key = dateKey(date);
  return weekPlan(profile, progress, focus, boost, date).filter((t) => t.date === key);
}

export function weeklyMinutes(profile: Profile) {
  // Summed per block: the fixed routine can leave less than the daily target on some days.
  return blocksOf(profile).reduce((a, b) => a + b.minutes, 0);
}

export function studyDays(profile: Profile) {
  return new Set(blocksOf(profile).map((b) => b.day));
}
