// Same threshold the API uses: shorter check-ins stay in the history but don't complete a task.
export const MIN_CHECKIN_MIN = 5;

export function formatMin(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
