// Labels and local-calendar date helpers for the screens. The plan itself comes from the API.
import type { Activity } from '@/lib/types';

export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const DAY_NAMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
export const DAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
export const PERIODS = ['Manhã', 'Tarde', 'Noite'];

export const ACTIVITY_LABEL: Record<Activity, string> = {
  teoria: 'Teoria + questões',
  exercicios: 'Bateria de questões',
  redacao: 'Redação',
  revisao: 'Revisão da semana',
  simulado: 'Simulado',
};

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Noon, so adding days never crosses a daylight-saving boundary into the wrong date.
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
