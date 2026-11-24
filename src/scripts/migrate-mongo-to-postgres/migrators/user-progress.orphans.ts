import { ObjectId } from 'bson';
import type { PrismaClient } from '../../../../generated/prisma/client';

export function toHexId(value: unknown): string | null {
  const hex =
    value instanceof ObjectId
      ? value.toHexString()
      : typeof value === 'string'
        ? value
        : null;
  return hex && /^[0-9a-f]{24}$/i.test(hex) ? hex.toLowerCase() : null;
}

export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole, finite number (Mongo stores doubles); null when not numeric. */
export function toInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value);
}

export function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * `filterBatch` implementation shared by every productivity migrator: Mongo
 * has no foreign keys, so rows can reference users that were never migrated
 * (deleted accounts, partial restores). Those are skipped with a reason
 * instead of failing the whole batch on the FK.
 */
export async function skipMissingUsers<T extends { userId: string }>(
  prisma: PrismaClient,
  rows: T[],
  label: string,
): Promise<{ rows: T[]; skipped: string[] }> {
  const ids = [...new Set(rows.map((r) => r.userId))];
  const existing = new Set(
    (
      await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      })
    ).map((u) => u.id),
  );
  const kept: T[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    if (existing.has(row.userId)) kept.push(row);
    else skipped.push(`${label}: user ${row.userId} does not exist`);
  }
  return { rows: kept, skipped };
}
