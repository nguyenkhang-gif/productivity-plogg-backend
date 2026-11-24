import { ObjectId } from 'bson';
import type { PrismaClient } from '../../../../generated/prisma/client';

/** Prisma client or interactive-transaction client. */
export type Db = Pick<PrismaClient, 'user' | 'post'>;

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
  );
}

export function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Cuts to a column's length so one over-long legacy value cannot fail a row. */
export function clip(value: unknown, max: number): string | null {
  const s = nonEmptyString(value);
  return s === null ? null : s.slice(0, max);
}

export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toHexId(value: unknown): string | null {
  const hex =
    value instanceof ObjectId
      ? value.toHexString()
      : typeof value === 'string'
        ? value
        : null;
  return hex && /^[0-9a-f]{24}$/i.test(hex) ? hex.toLowerCase() : null;
}

/** Non-negative integer counter; anything else becomes 0. */
export function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : 0;
}

export function timestamps(doc: Record<string, any>, id: string) {
  const createdAt = toDate(doc.createdAt) ?? new ObjectId(id).getTimestamp();
  const updatedAt = toDate(doc.updatedAt) ?? createdAt;
  return { createdAt, updatedAt };
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export async function existingUserIds(
  db: Db,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db.user.findMany({
    where: { id: { in: unique(ids) } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function existingPostIds(
  db: Db,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db.post.findMany({
    where: { id: { in: unique(ids) } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}
