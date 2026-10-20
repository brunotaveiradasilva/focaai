// Same threshold the API uses: shorter check-ins stay in the history but don't complete a task.
export const MIN_CHECKIN_MIN = 5;

export function formatMin(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** "agora", "5 min", "3 h", "2 d", then the date. */
export function timeAgo(iso: string, now = Date.now()) {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
