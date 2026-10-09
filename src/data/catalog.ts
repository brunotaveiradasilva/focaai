// Static catalog: exam calendar, courses, subjects and the roadmap tree.
import { ALL_TOPICS, combinedWeight, groupName, subjectName } from '@/data/edital';


export type SubjectId = 'mat' | 'por' | 'red' | 'fis' | 'qui' | 'bio' | 'his' | 'geo';

// ---------------------------------------------------------------------------
// Exam calendar
//
// Only dates confirmed by the organizers go here, each with the source it was checked
// against. When an edition has no official date yet, it is left out and the app says
// "data ainda não divulgada" instead of guessing. Re-check before every release.
// ---------------------------------------------------------------------------

export type ExamTrack = 'enem' | 'vestibulares' | 'ambos';

export type ExamPhase = { label: string; dates: string[] }; // ISO dates, local calendar days

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

export const EXAM_CALENDAR: ExamEvent[] = [
  {
    id: 'enem',
    name: 'ENEM 2026',
    kind: 'enem',
    cycle: 2026,
    phases: [
      { label: '1º dia', dates: ['2026-11-08'] },
      { label: '2º dia', dates: ['2026-11-15'] },
    ],
    source: 'Edital Inep, 22/05/2026',
    checkedAt: '2026-10-06',
  },
  {
    id: 'fuvest',
    name: 'Fuvest 2027 (USP)',
    kind: 'vestibular',
    cycle: 2026,
    phases: [
      { label: '1ª fase', dates: ['2026-11-01'] },
      { label: '2ª fase', dates: ['2026-12-06', '2026-12-07'] },
    ],
    source: 'Fuvest, calendário remarcado após o edital do ENEM 2026',
    checkedAt: '2026-10-06',
  },
  {
    id: 'unicamp',
    name: 'Unicamp 2027',
    kind: 'vestibular',
    cycle: 2026,
    phases: [
      { label: '1ª fase', dates: ['2026-10-18'] },
      { label: '2ª fase', dates: ['2026-11-29', '2026-11-30'] },
    ],
    source: 'Comvest/Unicamp',
    checkedAt: '2026-10-06',
  },
  {
    id: 'unesp',
    name: 'Unesp 2027',
    kind: 'vestibular',
    cycle: 2026,
    phases: [
      { label: '1ª fase', dates: ['2026-11-22'] },
      { label: '2ª fase', dates: ['2026-12-13', '2026-12-14'] },
    ],
    source: 'Vunesp, calendário remarcado após o edital do ENEM 2026',
    checkedAt: '2026-10-06',
  },
  {
    id: 'ufms',
    name: 'Vestibular UFMS 2027',
    kind: 'vestibular',
    cycle: 2026,
    phases: [{ label: 'Prova objetiva e redação', dates: ['2026-12-06'] }],
    // Full calendar (inscrições, gabaritos, resultado) in src/data/edital/exam.ufms-2027.json.
    source: 'Edital nº 344/2026-PROGRAD/UFMS',
    checkedAt: '2026-10-07',
  },
];

// Vestibulares a student can follow; their dates come from EXAM_CALENDAR for the chosen cycle.
export const VESTIBULARES = [
  { id: 'fuvest', name: 'Fuvest (USP)' },
  { id: 'unicamp', name: 'Unicamp' },
  { id: 'unesp', name: 'Unesp' },
  { id: 'ufms', name: 'UFMS' },
];

export const CYCLES = [2026, 2027];

export const TRACK_LABEL: Record<ExamTrack, string> = {
  enem: 'ENEM',
  vestibulares: 'Vestibulares',
  ambos: 'ENEM + vestibulares',
};

// ---------------------------------------------------------------------------
// Courses and competition
//
// Competition is measured by course, not by university: the same course is roughly as
// disputed everywhere, and that is what changes how hard the student has to push.
// Tiers are approximate, based on how SISU cut-off scores usually rank courses.
// ---------------------------------------------------------------------------

export type Tier = 'muito-alta' | 'alta' | 'media' | 'moderada';

export const TIERS: Record<
  Tier,
  { label: string; desc: string; simuladosPerMonth: number; redacoesPerWeek: number; questionShare: number }
> = {
  'muito-alta': {
    label: 'Muito alta',
    desc: 'Disputa por poucas vagas e notas de corte entre as mais altas. Seu plano tem mais questões, simulado toda semana e duas redações semanais.',
    simuladosPerMonth: 4,
    redacoesPerWeek: 2,
    questionShare: 0.5,
  },
  alta: {
    label: 'Alta',
    desc: 'Concorrência forte. O plano equilibra teoria e muitas questões, com simulado toda semana.',
    simuladosPerMonth: 4,
    redacoesPerWeek: 1,
    questionShare: 0.45,
  },
  media: {
    label: 'Média',
    desc: 'Concorrência moderada a forte, dependendo da instituição. Simulado a cada duas semanas.',
    simuladosPerMonth: 2,
    redacoesPerWeek: 1,
    questionShare: 0.4,
  },
  moderada: {
    label: 'Moderada',
    desc: 'Notas de corte mais acessíveis. O foco é construir base sólida com constância.',
    simuladosPerMonth: 2,
    redacoesPerWeek: 1,
    questionShare: 0.35,
  },
};

export type Course = { id: string; name: string; tier: Tier; focus: SubjectId[] };

export const COURSES: Course[] = [
  { id: 'medicina', name: 'Medicina', tier: 'muito-alta', focus: ['bio', 'qui', 'red'] },
  { id: 'direito', name: 'Direito', tier: 'alta', focus: ['red', 'por', 'his'] },
  { id: 'odontologia', name: 'Odontologia', tier: 'alta', focus: ['bio', 'qui'] },
  { id: 'veterinaria', name: 'Medicina Veterinária', tier: 'alta', focus: ['bio', 'qui'] },
  { id: 'psicologia', name: 'Psicologia', tier: 'alta', focus: ['bio', 'red', 'por'] },
  { id: 'computacao', name: 'Ciência da Computação', tier: 'alta', focus: ['mat', 'fis'] },
  { id: 'arquitetura', name: 'Arquitetura e Urbanismo', tier: 'alta', focus: ['mat', 'his'] },
  { id: 'ri', name: 'Relações Internacionais', tier: 'alta', focus: ['his', 'geo', 'red'] },
  { id: 'eng-civil', name: 'Engenharia Civil', tier: 'media', focus: ['mat', 'fis'] },
  { id: 'engenharias', name: 'Outras engenharias', tier: 'media', focus: ['mat', 'fis', 'qui'] },
  { id: 'enfermagem', name: 'Enfermagem', tier: 'media', focus: ['bio', 'qui'] },
  { id: 'farmacia', name: 'Farmácia', tier: 'media', focus: ['qui', 'bio'] },
  { id: 'fisioterapia', name: 'Fisioterapia', tier: 'media', focus: ['bio'] },
  { id: 'nutricao', name: 'Nutrição', tier: 'media', focus: ['bio', 'qui'] },
  { id: 'biomedicina', name: 'Biomedicina', tier: 'media', focus: ['bio', 'qui'] },
  { id: 'administracao', name: 'Administração', tier: 'media', focus: ['mat', 'por'] },
  { id: 'economia', name: 'Economia', tier: 'media', focus: ['mat', 'his'] },
  { id: 'comunicacao', name: 'Jornalismo / Publicidade', tier: 'media', focus: ['por', 'red'] },
  { id: 'contabeis', name: 'Ciências Contábeis', tier: 'moderada', focus: ['mat'] },
  { id: 'pedagogia', name: 'Pedagogia', tier: 'moderada', focus: ['por', 'red'] },
  { id: 'licenciaturas', name: 'Licenciaturas', tier: 'moderada', focus: [] },
  { id: 'agrarias', name: 'Agronomia / Zootecnia', tier: 'moderada', focus: ['bio', 'qui'] },
  { id: 'outro', name: 'Outro curso / ainda não sei', tier: 'media', focus: [] },
];

export const courseById = (id: string) => COURSES.find((c) => c.id === id) ?? COURSES[COURSES.length - 1];

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

// ENEM knowledge areas; also used to group questions in the question bank.
export type Area = 'linguagens' | 'humanas' | 'natureza' | 'matematica';

export const AREAS: { id: Area; name: string; short: string; subjects: SubjectId[] }[] = [
  { id: 'linguagens', name: 'Linguagens', short: 'LC', subjects: ['por', 'red'] },
  { id: 'humanas', name: 'Ciências Humanas', short: 'CH', subjects: ['his', 'geo'] },
  { id: 'natureza', name: 'Ciências da Natureza', short: 'CN', subjects: ['fis', 'qui', 'bio'] },
  { id: 'matematica', name: 'Matemática', short: 'MT', subjects: ['mat'] },
];

export const areaById = (id: Area) => AREAS.find((a) => a.id === id)!;
export const areaOfSubject = (s: SubjectId) => AREAS.find((a) => a.subjects.includes(s))!.id;

export type Subject = { id: SubjectId; name: string; short: string; color: string };

export const SUBJECTS: Subject[] = [
  { id: 'mat', name: 'Matemática', short: 'Mat', color: '#3FE0F0' },
  { id: 'por', name: 'Português', short: 'Port', color: '#7C8CF8' },
  { id: 'red', name: 'Redação', short: 'Red', color: '#C58CF8' },
  { id: 'fis', name: 'Física', short: 'Fís', color: '#E8B34D' },
  { id: 'qui', name: 'Química', short: 'Quí', color: '#F0A35E' },
  { id: 'bio', name: 'Biologia', short: 'Bio', color: '#6FD49A' },
  { id: 'his', name: 'História', short: 'His', color: '#AEBBCB' },
  { id: 'geo', name: 'Geografia', short: 'Geo', color: '#5B8DEF' },
];

export const subjectById = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!;

// ---------------------------------------------------------------------------
// Roadmap
//
// Topics come from the shared content tree (src/data/edital). Each student sees the topics
// the editais they follow cover, weighted by how explicitly each edital cites them.
// ---------------------------------------------------------------------------

// Taxonomy subjects without a roadmap tab of their own live in the closest one.
const HOST: Partial<Record<string, SubjectId>> = { lin: 'por', art: 'por', edf: 'por', fil: 'his', soc: 'his' };

// Lessons per tree topic. The editais give no size per topic, so every topic is the same.
export const LESSONS_PER_TOPIC = 3;

export type Topic = {
  id: string;
  subject: SubjectId;
  title: string;
  lessons: number;
  groupId: string;
  // Includes the taxonomy subject when it isn't the roadmap tab's own (e.g. "Filosofia").
  groupName: string;
  desc?: string;
  // Closing node of each subject: timed simulados instead of content.
  final?: boolean;
};

const fromTree: Topic[] = ALL_TOPICS.flatMap((t) => {
  const subject = HOST[t.subjectId] ?? (t.subjectId as SubjectId);
  if (!SUBJECTS.some((s) => s.id === subject)) return [];
  const group = groupName(t.groupId);
  const hosted = subject !== t.subjectId;
  const label = !hosted ? group : group === subjectName(t.subjectId) ? group : `${subjectName(t.subjectId)} · ${group}`;
  return [{ id: t.id, subject, title: t.name, lessons: LESSONS_PER_TOPIC, groupId: t.groupId, groupName: label }];
});

// Ids match the v2 roadmap's closing nodes, so their progress carries over.
const final = (subject: SubjectId, title: string, lessons: number, desc: string): Topic => ({
  id: `${subject}.sim`,
  subject,
  title,
  lessons,
  groupId: `${subject}.final`,
  groupName: 'Reta final',
  desc,
  final: true,
});

const FINALS: Topic[] = [
  final('mat', 'Simulados de Matemática', 4, 'Simulados cronometrados com questões reais de provas anteriores.'),
  final('por', 'Simulados de Linguagens', 3, 'Provas anteriores completas.'),
  final('red', 'Redações cronometradas', 6, 'Uma redação por semana com tema de prova anterior.'),
  final('fis', 'Simulados de Física', 3, 'Questões de provas anteriores.'),
  final('qui', 'Simulados de Química', 3, 'Questões de provas anteriores.'),
  final('bio', 'Simulados de Biologia', 3, 'Questões de provas anteriores.'),
  final('his', 'Simulados de História', 3, 'Questões de provas anteriores.'),
  final('geo', 'Simulados de Geografia', 3, 'Questões de provas anteriores.'),
];

export const TOPICS: Topic[] = [...fromTree, ...FINALS];

export const topicById = (id: string) => TOPICS.find((x) => x.id === id);

// A topic as one student sees it: weight 1 = cited explicitly by one of their editais,
// 0.5 = cited in part (or the exam's edital isn't mapped yet).
export type RoadTopic = Topic & { weight: number };

export const isMinor = (t: RoadTopic) => !t.final && t.weight < 1;

const roadCache = new Map<string, RoadTopic[]>();

// Roadmap of one subject for the exams the student follows, in study order. Topics none of
// those editais cover are left out.
export function roadmap(subject: SubjectId, examIds: string[]): RoadTopic[] {
  const key = `${subject}|${examIds.join(',')}`;
  let road = roadCache.get(key);
  if (!road) {
    road = TOPICS.filter((t) => t.subject === subject)
      .map((t) => ({ ...t, weight: t.final ? 1 : combinedWeight(examIds, t.id) }))
      .filter((t) => t.weight > 0);
    roadCache.set(key, road);
  }
  return road;
}
