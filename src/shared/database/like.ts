import { MAX_SEARCH_LENGTH } from 'src/shared/http/regex';

/**
 * Prisma's `contains` passes the term to LIKE/ILIKE unescaped, so user input
 * must have wildcards neutralised (Postgres' default escape char is backslash).
 * Counterpart of `escapeRegex` for the Postgres side.
 */
export function escapeLike(input: string): string {
  return String(input ?? '')
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[\\%_]/g, '\\$&');
}
