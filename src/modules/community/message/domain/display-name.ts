export function safeDisplayName(
  candidate: string | null | undefined,
  fallback: string,
): string {
  const name = candidate?.trim();
  if (!name || name.includes('@')) return fallback;
  return name;
}

export function displayNameFromClaims(claims: {
  username?: string;
  name?: string;
  userId?: string;
  sub?: string;
}): string {
  const id = claims.userId ?? claims.sub ?? '';
  return safeDisplayName(claims.username ?? claims.name, id);
}
