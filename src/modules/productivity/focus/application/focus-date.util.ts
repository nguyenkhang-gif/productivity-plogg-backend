/** "YYYY-MM-DD" for the given instant in a timezone tzOffset minutes east of UTC. */
export function localDateFor(now: Date, tzOffset: number): string {
  return new Date(now.getTime() + tzOffset * 60_000).toISOString().slice(0, 10);
}

/** Shift a "YYYY-MM-DD" string by whole days. */
export function addDays(localDate: string, days: number): string {
  const d = new Date(`${localDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
