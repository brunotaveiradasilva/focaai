// The student's fixed week (school, work, sports...) and the free time it leaves.
// Times are minutes from midnight; days follow the planner (0 = segunda).

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

export const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: 'escola', label: 'Escola' },
  { id: 'faculdade', label: 'Faculdade ou curso técnico' },
  { id: 'trabalho', label: 'Trabalho ou estágio' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'idioma', label: 'Inglês ou outro idioma' },
  { id: 'esporte', label: 'Esporte ou academia' },
  { id: 'cursinho', label: 'Cursinho ou aula particular' },
  { id: 'hobby', label: 'Hobby (música, arte, jogos)' },
  { id: 'religiao', label: 'Religião ou voluntariado' },
  { id: 'casa', label: 'Tarefas de casa e família' },
  { id: 'saude', label: 'Saúde (terapia, médico)' },
  { id: 'lazer', label: 'Lazer fixo (amigos, séries)' },
  { id: 'outro', label: 'Outro' },
];

export const kindLabel = (k: ActivityKind) => ACTIVITY_KINDS.find((x) => x.id === k)!.label;

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

export type Routine = {
  wake: number;
  sleep: number;
  lunchStart: number;
  lunchEnd: number;
  items: RoutineItem[];
};

export const DEFAULT_ROUTINE: Routine = { wake: 6 * 60 + 30, sleep: 23 * 60, lunchStart: 12 * 60, lunchEnd: 13 * 60, items: [] };

// One-tap fills for Monday to Friday.
export const PRESETS: { id: string; label: string; kind: ActivityKind; start: number; end: number }[] = [
  { id: 'escola-manha', label: 'Escola de manhã', kind: 'escola', start: 7 * 60, end: 12 * 60 + 30 },
  { id: 'escola-tarde', label: 'Escola à tarde', kind: 'escola', start: 13 * 60, end: 18 * 60 },
  { id: 'trabalho', label: 'Trabalho comercial', kind: 'trabalho', start: 8 * 60, end: 18 * 60 },
];

export const COMMUTES = [0, 15, 30, 45, 60];

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtTime = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

let seq = 0;
export const newItemId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

// Sleep past midnight (e.g. 00:30) counts as the end of the same day.
const bedtime = (r: Routine) => (r.sleep <= r.wake ? r.sleep + 24 * 60 : r.sleep);

// Time to get ready after waking up; never counted as study time.
const GET_READY = 30;
// Gaps shorter than this between commitments can't hold a study block.
const MIN_GAP = 30;

// Study windows behind the planner's periods (manhã, tarde, noite).
export function periodWindows(r: Routine): [number, number][] {
  const evening = Math.max(18 * 60, r.lunchEnd);
  return [
    [r.wake + GET_READY, r.lunchStart],
    [r.lunchEnd, evening],
    [evening, bedtime(r)],
  ];
}

// Minutes of a window left between the day's activities (travel included), counting only
// gaps long enough to study in.
export function freeMinutes(r: Routine, day: number, period: number): number {
  const [from, to] = periodWindows(r)[period];
  if (to <= from) return 0;
  const busy = r.items
    .filter((i) => i.day === day)
    .map((i) => [i.start - i.commute, i.end + i.commute] as const)
    .sort((a, b) => a[0] - b[0]);
  let free = 0;
  let cursor = from;
  const gap = (until: number) => {
    const g = Math.min(until, to) - cursor;
    if (g >= MIN_GAP) free += g;
  };
  for (const [a, b] of busy) {
    if (b <= cursor) continue;
    if (a >= to) break;
    gap(a);
    cursor = Math.max(cursor, b);
  }
  gap(to);
  return free;
}
