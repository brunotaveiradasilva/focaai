// Shapes the FocaAI API sends and receives (repo focaai-api). Field names match the old local store.
import type { Area, ExamTrack, SubjectId } from '@/data/catalog';

// Self-rated level per subject: 1 = tenho dificuldade, 2 = razoável, 3 = domino.
export type Level = 1 | 2 | 3;
export type Stage = 'em1' | 'em2' | 'em3' | 'formado' | 'cursinho';
export type Obstacle = 'celular' | 'rotina' | 'cansaco' | 'comeco' | 'ansiedade' | 'motivacao';

export type ActivityKind =
  | 'escola'
  | 'faculdade'
  | 'trabalho'
  | 'transporte'
  | 'idioma'
  | 'esporte'
  | 'cursinho'
  | 'hobby'
  | 'religiao'
  | 'casa'
  | 'saude'
  | 'lazer'
  | 'outro';

// Times are minutes from midnight; days follow the plan (0 = segunda).
export type RoutineItem = {
  id: string;
  kind: ActivityKind;
  name?: string;
  day: number;
  start: number;
  end: number;
  // Travel time before and after, in minutes.
  commute: number;
};

export type Routine = { wake: number; sleep: number; lunchStart: number; lunchEnd: number; items: RoutineItem[] };

export type Profile = {
  name: string;
  track: ExamTrack;
  vestibulares: string[];
  // Year the exams are taken in.
  cycle: number;
  courseId: string;
  stage: Stage;
  firstAttempt: boolean;
  language: 'ingles' | 'espanhol';
  levels: Record<SubjectId, Level>;
  // 21 cells, index = period * 7 + day (period 0 manhã, 1 tarde, 2 noite; day 0 = segunda).
  week: boolean[];
  minutesPerDay: number;
  sessionMin: number;
  routine?: Routine;
  obstacles: Obstacle[];
  createdAt: string;
};

export type Adjustment = { at: string; subject?: SubjectId; text: string };

/** GET /api/eu/estado. `profile` null = onboarding not done yet. */
export type StudentState = {
  profile: Profile | null;
  progress: Record<string, number>;
  focus: Partial<Record<SubjectId, string>>;
  boost: Partial<Record<SubjectId, number>>;
  adjustments: Adjustment[];
};

export type Activity = 'teoria' | 'exercicios' | 'redacao' | 'revisao' | 'simulado';

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

export type ExamDate = { examId: string; examName: string; phase: string; date: string };

export type PlanSummary = {
  goalLabel: string;
  weeklyMinutes: number;
  studyDays: number[];
  exams: { id: string; name: string; phases: { label: string; dates: string[] }[] }[];
  examDates: ExamDate[];
};

/** GET /api/eu/semana */
export type Week = { today: string; tasks: Task[]; done: string[]; overdue: Task[]; summary: PlanSummary };

/** POST /api/plano/previa. `free[day][period]` = free minutes the routine leaves (null without routine). */
export type PlanPreview = { tasks: Task[]; summary: PlanSummary; free: number[][] | null };

export type Checkin = {
  id: string;
  at: string;
  taskId?: string;
  subject?: SubjectId;
  topicId?: string;
  minutes: number;
  feeling: 1 | 2 | 3;
  questions: number;
  correct: number;
};

export type CheckinResult = {
  checkin: Checkin;
  lessons: number;
  adjustment: Adjustment | null;
  state: StudentState;
};

export type SimQuestion = {
  key: string;
  year: number;
  index: number;
  area: Area;
  context: string;
  intro: string;
  files: string[];
  alternatives: { letter: string; text: string | null; file: string | null }[];
  // Only once the simulado is finished.
  correct?: string;
};

export type Score = {
  total: number;
  correct: number;
  byArea: Partial<Record<Area, { total: number; correct: number }>>;
};

export type Simulado = {
  id: string;
  createdAt: string;
  finishedAt?: string;
  areas: Area[];
  questions: SimQuestion[];
  answers: Record<string, string>;
  seconds: number;
  // Only once finished.
  score?: Score;
};

export type SimuladoSummary = Omit<Simulado, 'questions' | 'answers'> & { score: Score };

/** GET /api/eu/estatisticas */
export type Stats = {
  today: string;
  streak: number;
  bestStreak: number;
  minutesToday: number;
  days: { date: string; minutes: number }[];
  minutesBySubject: Partial<Record<SubjectId, number>>;
  questions: { total: number; correct: number; pct: number | null };
  areas: { area: Area; total: number; correct: number; pct: number | null }[];
  checkins: number;
  simulados: number;
  roadmap: { subject: SubjectId; done: number; total: number }[];
};

export type TopicState = 'done' | 'doing' | 'todo';

/** GET /api/eu/roteiros/{subject} */
export type StudentRoadmap = {
  subject: SubjectId;
  current: string;
  topics: (import('@/data/catalog').RoadTopic & { state: TopicState; done: number; focus: boolean })[];
};

export type Person = {
  id: string;
  name: string;
  city: string;
  track: ExamTrack;
  cycle: number;
  courseId: string;
  periods: number[];
  strong: SubjectId[];
  weak: SubjectId[];
  streak: number;
  bio: string;
};

/** GET /api/eu/pessoas */
export type PeopleScreen = {
  matches: { person: Person; score: number; reasons: string[]; helpsWith: SubjectId[]; connection: 'pending' | 'connected' | null }[];
  groups: { id: string; name: string; desc: string; joined: boolean }[];
};
