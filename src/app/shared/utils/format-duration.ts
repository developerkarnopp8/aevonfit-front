/** segundos → "42 min" | "1h 05" | "—" (0/undefined) */
export function formatDurationShort(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const min = Math.round(totalSeconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return `${h}h ${rem.toString().padStart(2, '0')}`;
}
