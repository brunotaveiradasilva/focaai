import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Area, ExamTrack, SUBJECTS, SubjectId, roadmap, topicById } from '@/data/catalog';
import { examIdsOf, type Task } from '@/lib/planner';
import type { Routine } from '@/lib/routine';
import { migrateProgress } from '@/store/migrate-roadmap';

// Self-rated level per subject: 1 = tenho dificuldade, 2 = razoável, 3 = domino.
export type Level = 1 | 2 | 3;
export type Stage = 'em1' | 'em2' | 'em3' | 'formado' | 'cursinho';
export type Obstacle = 'celular' | 'rotina' | 'cansaco' | 'comeco' | 'ansiedade' | 'motivacao';

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
  // Fixed commitments; absent for profiles made before this step existed.
  routine?: Routine;
  obstacles: Obstacle[];
  createdAt: string;
};

// What the student logs after studying, instead of a locked-screen timer.
export type Checkin = {
  id: string;
  at: string;
  taskId?: string;
  // Absent for whole-week blocks such as the review or a simulado.
  subject?: SubjectId;
  topicId?: string;
  minutes: number;
  feeling: 1 | 2 | 3; // fácil, ok, difícil
  questions: number;
  correct: number;
};

export type SimQuestion = {
  key: string; // `${year}-${index}`
  year: number;
  index: number;
  area: Area;
  context: string;
  intro: string;
  files: string[];
  alternatives: { letter: string; text: string | null; file: string | null }[];
  correct: string;
};

export type Simulado = {
  id: string;
  createdAt: string;
  finishedAt?: string;
  areas: Area[];
  questions: SimQuestion[];
  answers: Record<string, string>;
  seconds: number;
};

export type Adjustment = { at: string; subject?: SubjectId; text: string };

type State = {
  profile: Profile | null;
  progress: Record<string, number>;
  // Topic the student chose to focus on in each subject; the planner follows it.
  focus: Partial<Record<SubjectId, string>>;
  boost: Partial<Record<SubjectId, number>>;
  checkins: Checkin[];
  simulados: Simulado[];
  activeSimulado: Simulado | null;
  adjustments: Adjustment[];
  // Each day's plan is frozen once generated, so overdue tasks can be found later.
  plans: Record<string, Task[]>;
  dismissed: string[];
  connections: Record<string, 'pending' | 'connected'>;
  groups: string[];
  hydrated: boolean;
  // "Agora não" on the routine prompt at launch; lasts until the app is opened again.
  routineSkipped: boolean;

  completeOnboarding: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  setPlan: (key: string, tasks: Task[]) => void;
  logCheckin: (c: Checkin, lessons: number, adj?: { boost?: number; text: string }) => void;
  setTopicDone: (topicId: string, done: boolean) => void;
  setFocus: (subject: SubjectId, topicId: string | null) => void;
  dismissTask: (taskId: string) => void;
  startSimulado: (s: Simulado) => void;
  answer: (key: string, letter: string) => void;
  tickSimulado: (seconds: number) => void;
  finishSimulado: () => string | null;
  discardSimulado: () => void;
  connect: (personId: string) => void;
  toggleGroup: (groupId: string) => void;
  reset: () => void;
};

const MAX_BOOST = 3;
const BOOST_DECAY = 0.25;
const MIN_CHECKIN_MIN = 5;
const KEEP_PLAN_DAYS = 21;

const initial = {
  profile: null,
  progress: {},
  focus: {},
  boost: {},
  checkins: [],
  simulados: [],
  activeSimulado: null,
  adjustments: [],
  plans: {},
  dismissed: [],
  connections: {},
  groups: [],
};

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: false,
      routineSkipped: false,

      completeOnboarding: (p) =>
        set((st) => {
          // Redoing the questionnaire only swaps the profile; history and progress stay.
          if (st.profile) return { profile: p, plans: {} };
          // Subjects the student already masters start with their first group of topics done.
          const progress: Record<string, number> = {};
          for (const s of SUBJECTS) {
            if (p.levels[s.id] !== 3) continue;
            const road = roadmap(s.id, examIdsOf(p));
            for (const topic of road) if (topic.groupId === road[0].groupId) progress[topic.id] = topic.lessons;
          }
          return { ...initial, profile: p, progress };
        }),

      updateProfile: (p) =>
        set((st) => (st.profile ? { profile: { ...st.profile, ...p }, plans: {} } : {})),

      setPlan: (key, tasks) =>
        set((st) => {
          const keys = Object.keys(st.plans).sort().slice(-KEEP_PLAN_DAYS);
          const plans: Record<string, Task[]> = {};
          for (const k of keys) plans[k] = st.plans[k];
          plans[key] = tasks;
          return { plans };
        }),

      logCheckin: (c, lessons, adj) =>
        set((st) => {
          const topic = c.topicId ? topicById(c.topicId) : undefined;
          const progress = { ...st.progress };
          if (topic && lessons > 0) {
            progress[topic.id] = Math.min(topic.lessons, (progress[topic.id] ?? 0) + lessons);
          }
          // Boost is capped so one subject can't take over the week, and a normal session
          // (no adjustment) relaxes it a little, so extra weight fades once the student recovers.
          const boost = { ...st.boost };
          const delta = adj?.boost ?? (c.minutes >= MIN_CHECKIN_MIN ? -BOOST_DECAY : 0);
          if (c.subject && delta) {
            boost[c.subject] = Math.min(MAX_BOOST, Math.max(0, (boost[c.subject] ?? 0) + delta));
          }
          const adjustments = adj
            ? [{ at: c.at, subject: c.subject, text: adj.text }, ...st.adjustments].slice(0, 20)
            : st.adjustments;
          return { checkins: [...st.checkins, c], progress, boost, adjustments };
        }),

      setTopicDone: (topicId, done) =>
        set((st) => {
          const topic = topicById(topicId);
          if (!topic) return {};
          return { progress: { ...st.progress, [topicId]: done ? topic.lessons : 0 } };
        }),

      setFocus: (subject, topicId) =>
        set((st) => {
          const focus = { ...st.focus };
          if (topicId) focus[subject] = topicId;
          else delete focus[subject];
          return { focus };
        }),

      dismissTask: (taskId) => set((st) => ({ dismissed: [...st.dismissed, taskId].slice(-200) })),

      startSimulado: (s) => set({ activeSimulado: s }),
      answer: (key, letter) =>
        set((st) =>
          st.activeSimulado
            ? { activeSimulado: { ...st.activeSimulado, answers: { ...st.activeSimulado.answers, [key]: letter } } }
            : {},
        ),
      tickSimulado: (seconds) =>
        set((st) => (st.activeSimulado ? { activeSimulado: { ...st.activeSimulado, seconds } } : {})),
      finishSimulado: () => {
        const sim = get().activeSimulado;
        if (!sim) return null;
        const done = { ...sim, finishedAt: new Date().toISOString() };
        set((st) => ({ simulados: [done, ...st.simulados].slice(0, 100), activeSimulado: null }));
        return done.id;
      },
      discardSimulado: () => set({ activeSimulado: null }),

      connect: (personId) => set((st) => ({ connections: { ...st.connections, [personId]: 'pending' } })),
      toggleGroup: (groupId) =>
        set((st) => ({
          groups: st.groups.includes(groupId) ? st.groups.filter((g) => g !== groupId) : [...st.groups, groupId],
        })),

      reset: () => set(() => ({ ...initial })),
    }),
    {
      name: 'focaai-state-v1',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _h, routineSkipped: _r, ...rest }) => rest,
      migrate: (persisted, version) => {
        // v1 profiles predate the new onboarding; start fresh instead of guessing the new fields.
        if (version < 2) return { ...initial };
        const st = persisted as State;
        // v3 swapped the roadmap for the content tree: old focus and frozen plans point at
        // topics that no longer exist.
        if (version < 3) return { ...st, progress: migrateProgress(st.progress), focus: {}, plans: {} };
        return st;
      },
      onRehydrateStorage: () => () => {
        useApp.setState({ hydrated: true });
      },
    },
  ),
);
