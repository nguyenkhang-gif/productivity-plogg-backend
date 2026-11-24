export function clampLimit(
  raw: string | undefined,
  fallback?: number,
  max = 100,
): number | undefined {
  if (raw === undefined || raw === '') return fallback;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), max);
}
