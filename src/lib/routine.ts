// Options for editing the student's fixed week. How much free time it leaves comes from the API
// (POST /api/plano/previa, `free`).
import type { ActivityKind, Routine } from '@/lib/types';

export type { ActivityKind, Routine, RoutineItem } from '@/lib/types';

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

export const DEFAULT_ROUTINE: Routine = { wake: 6 * 60 + 30, sleep: 23 * 60, lunchStart: 12 * 60, lunchEnd: 13 * 60, items: [] };

// One-tap fills for Monday to Friday.
export const PRESETS: { id: string; label: string; kind: ActivityKind; start: number; end: number }[] = [
  { id: 'escola-manha', label: 'Escola de manhã', kind: 'escola', start: 7 * 60, end: 12 * 60 + 30 },
  { id: 'escola-tarde', label: 'Escola à tarde', kind: 'escola', start: 13 * 60, end: 18 * 60 },
  { id: 'trabalho', label: 'Trabalho comercial', kind: 'trabalho', start: 8 * 60, end: 18 * 60 },
];

export const COMMUTES = [0, 15, 30, 45, 60];

// Gaps shorter than this can't hold a study block (same rule as the API's plan).
export const MIN_FREE = 30;

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtTime = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

let seq = 0;
export const newItemId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;
