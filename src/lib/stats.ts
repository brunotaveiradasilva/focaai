// Derived numbers for the Início, Evolução and Pessoas screens.
import { AREAS, Area, SubjectId } from '@/data/catalog';
import { MIN_CHECKIN_MIN } from '@/lib/coach';
import { Task, addDays, dateKey, studyDays, weekdayIndex } from '@/lib/planner';
import type { Checkin, Profile, Simulado } from '@/store/app';

export const minutesOn = (checkins: Checkin[], key: string) =>
  checkins.filter((c) => dateKey(new Date(c.at)) === key).reduce((a, c) => a + c.minutes, 0);

// A day counts when the student logged real study or finished a simulado.
function activeDays(checkins: Checkin[], simulados: Simulado[]) {
  const days = new Set<string>();
  for (const c of checkins) if (c.minutes >= MIN_CHECKIN_MIN) days.add(dateKey(new Date(c.at)));
  for (const s of simulados) if (s.finishedAt) days.add(dateKey(new Date(s.finishedAt)));
  return days;
}

// Consecutive study days. Days off in the student's own routine don't break the streak,
// and today only counts once it happens, so the streak isn't lost at breakfast.
export function streak(profile: Profile, checkins: Checkin[], simulados: Simulado[], today = new Date()) {
  const active = activeDays(checkins, simulados);
  const planned = studyDays(profile);
  let count = 0;
  let d = active.has(dateKey(today)) ? today : addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    const key = dateKey(d);
    if (active.has(key)) count++;
    else if (planned.has(weekdayIndex(d))) break;
    d = addDays(d, -1);
  }
  return count;
}

export function bestStreak(profile: Profile, checkins: Checkin[], simulados: Simulado[]) {
  const active = [...activeDays(checkins, simulados)].sort();
  if (!active.length) return 0;
  const planned = studyDays(profile);
  let best = 0;
  let run = 0;
  let d = new Date(`${active[0]}T12:00:00`);
  const end = new Date(`${active[active.length - 1]}T12:00:00`);
  const set = new Set(active);
  while (d <= end) {
    const key = dateKey(d);
    if (set.has(key)) best = Math.max(best, ++run);
    else if (planned.has(weekdayIndex(d))) run = 0;
    d = addDays(d, 1);
  }
  return best;
}

export function doneTaskIds(checkins: Checkin[], simulados: Simulado[], tasks: Task[]) {
  const ids = new Set(checkins.filter((c) => c.taskId && c.minutes >= MIN_CHECKIN_MIN).map((c) => c.taskId!));
  // Finishing a simulado in the Banco de Questões completes that day's simulado block.
  const simDays = new Set(simulados.filter((s) => s.finishedAt).map((s) => dateKey(new Date(s.finishedAt!))));
  for (const t of tasks) if (t.activity === 'simulado' && simDays.has(t.date)) ids.add(t.id);
  return ids;
}

// Planned tasks from the last week that were neither done nor dismissed.
export function overdueTasks(
  plans: Record<string, Task[]>,
  checkins: Checkin[],
  simulados: Simulado[],
  dismissed: string[],
  today = new Date(),
) {
  const todayKey = dateKey(today);
  const weekAgo = dateKey(addDays(today, -7));
  const past = Object.entries(plans)
    .filter(([k]) => k < todayKey && k >= weekAgo)
    .flatMap(([, tasks]) => tasks);
  const done = doneTaskIds(checkins, simulados, past);
  const skip = new Set(dismissed);
  return past.filter((t) => !done.has(t.id) && !skip.has(t.id));
}

export function scoreOf(sim: Simulado) {
  const byArea: Partial<Record<Area, { total: number; correct: number }>> = {};
  let correct = 0;
  for (const q of sim.questions) {
    const ok = sim.answers[q.key] === q.correct;
    if (ok) correct++;
    const a = (byArea[q.area] ??= { total: 0, correct: 0 });
    a.total++;
    if (ok) a.correct++;
  }
  return { total: sim.questions.length, correct, byArea };
}

export function areaAccuracy(simulados: Simulado[]) {
  return AREAS.map((area) => {
    let total = 0;
    let correct = 0;
    for (const s of simulados) {
      const a = scoreOf(s).byArea[area.id];
      if (a) {
        total += a.total;
        correct += a.correct;
      }
    }
    return { area, total, correct, pct: total ? correct / total : null };
  });
}

export function questionTotals(checkins: Checkin[], simulados: Simulado[]) {
  let total = 0;
  let correct = 0;
  for (const c of checkins) {
    total += c.questions;
    correct += c.correct;
  }
  for (const s of simulados) {
    const sc = scoreOf(s);
    total += sc.total;
    correct += sc.correct;
  }
  return { total, correct, pct: total ? correct / total : null };
}

export function minutesBySubject(checkins: Checkin[], sinceKey: string) {
  const out: Partial<Record<SubjectId, number>> = {};
  for (const c of checkins) {
    if (!c.subject || dateKey(new Date(c.at)) < sinceKey) continue;
    out[c.subject] = (out[c.subject] ?? 0) + c.minutes;
  }
  return out;
}

export function lastDays(checkins: Checkin[], n: number, today = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, i - n + 1);
    const key = dateKey(d);
    return { key, date: d, minutes: minutesOn(checkins, key) };
  });
}
