// Content taxonomy and per-exam syllabus mappings ("edital → árvore de conteúdos").
//
// The JSON files are the source of truth and mirror the `topic` / `edital_topic` / `exam_date`
// tables in db/schema.sql, so they can be imported into the backend as-is later. Weights are
// 1.0 (cited explicitly in the edital) or 0.5 (partial or inferred); none of them has been
// reviewed by a teacher yet (`revisado_por: null`).
import enemMapping from './mapping.enem.json';
import ufmsMapping from './mapping.ufms-2027.json';
import ufmsExam from './exam.ufms-2027.json';
import taxonomy from './taxonomy.json';

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export type TaxTopic = { id: string; name: string; groupId: string; subjectId: string };
export type TaxGroup = { id: string; name: string; topics: { id: string; name: string }[] };
export type TaxSubject = { id: string; name: string; groups: TaxGroup[] };

export const TAXONOMY_VERSION: string = taxonomy.version;
export const TAX_SUBJECTS: TaxSubject[] = taxonomy.subjects;

const topicIndex = new Map<string, TaxTopic>();
for (const s of TAX_SUBJECTS)
  for (const g of s.groups)
    for (const t of g.topics) topicIndex.set(t.id, { id: t.id, name: t.name, groupId: g.id, subjectId: s.id });

export const taxTopicById = (id: string) => topicIndex.get(id);
export const taxSubjectById = (id: string) => TAX_SUBJECTS.find((s) => s.id === id);

// Topic ids are `subject.group.topic`, so the parts can be read even for ids the
// taxonomy doesn't list yet.
export const subjectOfTopic = (id: string) => id.split('.')[0];
export const groupOfTopic = (id: string) => id.split('.').slice(0, 2).join('.');

// Subjects and groups cited by the editais that the taxonomy doesn't have yet.
const EXTRA_NAMES: Record<string, string> = {
  art: 'Artes',
  'art.linguagens-artisticas': 'Linguagens artísticas',
  edf: 'Educação Física',
  'edf.linguagem-corporal': 'Linguagem corporal',
  'bio.ciencia-e-sociedade': 'Ciência e sociedade',
  'his.cultura-e-sociedade': 'Cultura e sociedade',
};

const groupIndex = new Map(TAX_SUBJECTS.flatMap((s) => s.groups.map((g) => [g.id, g.name] as const)));

export const subjectName = (id: string) => taxSubjectById(id)?.name ?? EXTRA_NAMES[id] ?? id;
export const groupName = (id: string) => groupIndex.get(id) ?? EXTRA_NAMES[id] ?? id;

// ---------------------------------------------------------------------------
// Edital mappings
// ---------------------------------------------------------------------------

export type EditalId = 'enem' | 'ufms-2027';

export type EditalTopic = {
  topicId: string;
  name: string;
  weight: number;
  // False when the edital cites a topic the taxonomy doesn't have yet.
  inTaxonomy: boolean;
};

export type Edital = {
  id: EditalId;
  exam: string;
  source: string;
  edital?: string;
  checkedAt?: string;
  reviewedBy: string | null;
  notice: string;
  requiredBooks: { title: string; author: string }[];
  topics: EditalTopic[];
};

type RawMapping = {
  aviso: string;
  exam: string;
  fonte: string;
  edital?: string;
  verificado_em?: string;
  revisado_por: string | null;
  obras_obrigatorias?: { titulo: string; autor: string }[];
  topicos: { topic_id: string; nome: string; weight: number }[];
};

const toEdital = (id: EditalId, raw: RawMapping): Edital => ({
  id,
  exam: raw.exam,
  source: raw.fonte,
  edital: raw.edital,
  checkedAt: raw.verificado_em,
  reviewedBy: raw.revisado_por,
  notice: raw.aviso,
  requiredBooks: (raw.obras_obrigatorias ?? []).map((b) => ({ title: b.titulo, author: b.autor })),
  topics: raw.topicos.map((t) => ({
    topicId: t.topic_id,
    name: taxTopicById(t.topic_id)?.name ?? t.nome,
    weight: t.weight,
    inTaxonomy: topicIndex.has(t.topic_id),
  })),
});

export const EDITAIS: Record<EditalId, Edital> = {
  enem: toEdital('enem', enemMapping),
  'ufms-2027': toEdital('ufms-2027', ufmsMapping),
};

const weightIndex = Object.fromEntries(
  Object.values(EDITAIS).map((e) => [e.id, new Map(e.topics.map((t) => [t.topicId, t.weight]))]),
) as Record<EditalId, Map<string, number>>;

// Weight of a topic in an edital; 0 when the edital doesn't cover it.
export function topicWeight(edital: EditalId, topicId: string): number {
  return weightIndex[edital].get(topicId) ?? 0;
}

// Topics of an edital for one subject, heaviest first.
export function editalTopicsOf(edital: EditalId, subjectId: string): EditalTopic[] {
  return EDITAIS[edital].topics
    .filter((t) => subjectOfTopic(t.topicId) === subjectId)
    .sort((a, b) => b.weight - a.weight);
}

// ---------------------------------------------------------------------------
// Every topic the app knows
//
// The taxonomy in its own order, plus the topics only the editais cite, each placed at the
// end of its group (or of its subject, when the group is new too).
// ---------------------------------------------------------------------------

export const ALL_TOPICS: (TaxTopic & { inTaxonomy: boolean })[] = (() => {
  const list = TAX_SUBJECTS.flatMap((s) =>
    s.groups.flatMap((g) => g.topics.map((t) => ({ ...topicIndex.get(t.id)!, inTaxonomy: true }))),
  );
  const seen = new Set(list.map((t) => t.id));
  for (const e of Object.values(EDITAIS)) {
    for (const t of e.topics) {
      if (seen.has(t.topicId)) continue;
      seen.add(t.topicId);
      const topic = {
        id: t.topicId,
        name: t.name,
        groupId: groupOfTopic(t.topicId),
        subjectId: subjectOfTopic(t.topicId),
        inTaxonomy: false,
      };
      const lastWhere = (f: (x: TaxTopic) => boolean) => list.reduce((at, x, i) => (f(x) ? i : at), -1);
      let at = lastWhere((x) => x.groupId === topic.groupId);
      if (at < 0) at = lastWhere((x) => x.subjectId === topic.subjectId);
      if (at < 0) list.push(topic);
      else list.splice(at + 1, 0, topic);
    }
  }
  return list;
})();

// ---------------------------------------------------------------------------
// From the exams a student follows to topic weights
// ---------------------------------------------------------------------------

// Exam ids as used in EXAM_CALENDAR / VESTIBULARES.
const EDITAL_OF_EXAM: Partial<Record<string, EditalId>> = { enem: 'enem', ufms: 'ufms-2027' };

export const editalOfExam = (examId: string) => EDITAL_OF_EXAM[examId];

// Exams whose syllabus hasn't been mapped yet count every topic at this weight, so the
// roadmap doesn't hide anything they might ask.
export const UNMAPPED_WEIGHT = 0.5;

export function examWeight(examId: string, topicId: string): number {
  const edital = EDITAL_OF_EXAM[examId];
  return edital ? topicWeight(edital, topicId) : UNMAPPED_WEIGHT;
}

// Highest weight across the exams a student follows.
export function combinedWeight(examIds: string[], topicId: string): number {
  return Math.max(0, ...examIds.map((e) => examWeight(e, topicId)));
}

// ---------------------------------------------------------------------------
// UFMS 2027: calendar, test structure and per-course weights
// ---------------------------------------------------------------------------

// Objective-test areas plus the essay, as the edital abbreviates them.
export type UfmsArea = 'RED' | 'MAT' | 'LIN' | 'HUM' | 'NAT';

export type UfmsDate = { label: string; start: string; end?: string; time?: string };

export const UFMS_2027 = {
  exam: ufmsExam.exam,
  organizer: ufmsExam.organizadora,
  source: ufmsExam.edital,
  checkedAt: ufmsExam.verificado_em,
  notice: ufmsExam.aviso,
  // Each entry is either a single day (`data`) or a range (`inicio`/`fim`).
  dates: ufmsExam.datas.map(
    (d): UfmsDate => ({
      label: d.label,
      start: ('data' in d ? d.data : d.inicio) as string,
      end: 'fim' in d ? d.fim : undefined,
      time: 'horario' in d ? d.horario : undefined,
    }),
  ),
  structure: ufmsExam.estrutura,
  pending: ufmsExam.outras_provas_a_confirmar,
  // Sample of the courses in Anexo II; the rest still needs to be imported.
  weightsByCourse: ufmsExam.pesos_por_curso as Record<string, Record<UfmsArea, number>>,
};

export const UFMS_COURSES = Object.keys(UFMS_2027.weightsByCourse).sort((a, b) => a.localeCompare(b, 'pt-BR'));
