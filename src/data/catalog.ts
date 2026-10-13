// Fixed content (subjects, courses, exam calendar, the roadmap topics) served by the API at
// GET /api/conteudo. It is loaded once at launch, before any screen renders, and kept on the device
// so the app still opens offline; the exports below are filled in place, so screens read them as
// plain constants.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/lib/api';

export type SubjectId = 'mat' | 'por' | 'red' | 'fis' | 'qui' | 'bio' | 'his' | 'geo';
export type Area = 'linguagens' | 'humanas' | 'natureza' | 'matematica';
export type ExamTrack = 'enem' | 'vestibulares' | 'ambos';
export type Tier = 'muito-alta' | 'alta' | 'media' | 'moderada';

export type Subject = { id: SubjectId; name: string; short: string; color: string };
export type AreaInfo = { id: Area; name: string; short: string; subjects: SubjectId[] };
export type Course = { id: string; name: string; tier: Tier; focus: SubjectId[] };
export type TierInfo = { label: string; desc: string; simuladosPerMonth: number; redacoesPerWeek: number; questionShare: number };
export type ExamPhase = { label: string; dates: string[] };
export type ExamEvent = {
  id: string;
  name: string;
  kind: 'enem' | 'vestibular';
  // Year the exam is applied in (Fuvest 2027 is applied in 2026).
  cycle: number;
  phases: ExamPhase[];
  source: string;
  checkedAt: string;
};

export type Topic = {
  id: string;
  subject: SubjectId;
  title: string;
  lessons: number;
  groupId: string;
  groupName: string;
  desc?: string;
  // Closing node of each subject: timed simulados instead of content.
  final?: boolean;
};

// A topic as one student sees it: weight 1 = cited explicitly by one of their editais, 0.5 = in
// part (or the exam's edital isn't mapped yet); `exams` explains it per exam.
export type RoadTopic = Topic & {
  weight: number;
  exams?: { examId: string; mapped: boolean; weight: number }[];
};

type Content = {
  subjects: Subject[];
  areas: AreaInfo[];
  courses: Course[];
  tiers: Record<Tier, TierInfo>;
  exams: ExamEvent[];
  vestibulares: { id: string; name: string }[];
  cycles: number[];
  trackLabels: Record<ExamTrack, string>;
  topics: Topic[];
};

export const SUBJECTS: Subject[] = [];
export const AREAS: AreaInfo[] = [];
export const COURSES: Course[] = [];
export const TIERS = {} as Record<Tier, TierInfo>;
export const EXAM_CALENDAR: ExamEvent[] = [];
export const VESTIBULARES: { id: string; name: string }[] = [];
export const CYCLES: number[] = [];
export const TRACK_LABEL = {} as Record<ExamTrack, string>;
export const TOPICS: Topic[] = [];

const fill = <T,>(target: T[], items: T[]) => target.splice(0, target.length, ...items);

function apply(c: Content) {
  fill(SUBJECTS, c.subjects);
  fill(AREAS, c.areas);
  fill(COURSES, c.courses);
  Object.assign(TIERS, c.tiers);
  fill(EXAM_CALENDAR, c.exams);
  fill(VESTIBULARES, c.vestibulares);
  fill(CYCLES, c.cycles);
  Object.assign(TRACK_LABEL, c.trackLabels);
  fill(TOPICS, c.topics);
}

const CACHE = 'focaai-content-v1';

/**
 * Loads the content from the API, falling back to the copy saved on the last launch. Resolves to
 * false only when neither is available (first launch offline).
 */
export async function loadContent(): Promise<boolean> {
  try {
    const content = await api<Content>('/api/conteudo', { auth: false });
    apply(content);
    AsyncStorage.setItem(CACHE, JSON.stringify(content)).catch(() => {});
    return true;
  } catch {
    try {
      const saved = await AsyncStorage.getItem(CACHE);
      if (saved) {
        apply(JSON.parse(saved));
        return true;
      }
    } catch {
      // Storage unavailable.
    }
    return false;
  }
}

export const courseById = (id: string) => COURSES.find((c) => c.id === id) ?? COURSES[COURSES.length - 1];
export const subjectById = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!;
export const areaById = (id: Area) => AREAS.find((a) => a.id === id)!;
export const areaOfSubject = (s: SubjectId) => AREAS.find((a) => a.subjects.includes(s))!.id;
export const topicById = (id: string) => TOPICS.find((t) => t.id === id);
export const isMinor = (t: RoadTopic) => !t.final && t.weight < 1;
