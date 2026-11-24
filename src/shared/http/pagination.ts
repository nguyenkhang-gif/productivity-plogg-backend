export function clampPagination(
  page: unknown,
  limit: unknown,
  max = 50,
  defaultLimit = 20,
): { page: number; limit: number } {
  const p = Math.floor(Number(page));
  const l = Math.floor(Number(limit));
  return {
    page: Number.isFinite(p) && p >= 1 ? p : 1,
    limit: Number.isFinite(l) && l >= 1 ? Math.min(l, max) : defaultLimit,
  };
}
