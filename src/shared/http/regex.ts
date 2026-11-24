export const MAX_SEARCH_LENGTH = 100;

export function escapeRegex(input: string): string {
  return String(input ?? '')
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
