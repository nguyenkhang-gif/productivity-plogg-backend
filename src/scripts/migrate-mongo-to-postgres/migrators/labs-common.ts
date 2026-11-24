import { ObjectId } from 'bson';
import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';

/** Helpers shared by the labs migrators (epub, story/translation context, mail log). */

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

/** Postgres text/jsonb cannot hold NUL characters. */
function stripNul(value: string): string {
  return value.includes('\u0000') ? value.replace(/\u0000/g, '') : value;
}

/** String value or `fallback`; NULs removed. Empty strings are kept. */
export function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? stripNul(value) : fallback;
}

export function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? stripNul(value) : null;
}

/**
 * Normalises a Mongo value into plain JSON: Dates become ISO strings,
 * ObjectIds hex strings, `undefined` keys are dropped and NULs are removed.
 */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value ?? null, (_k, v) =>
      typeof v === 'string' ? stripNul(v) : v,
    ),
  );
}

export function toJsonArray(value: unknown): Prisma.InputJsonValue {
  return Array.isArray(value) ? toJson(value) : [];
}

export function isPlainObject(value: unknown): value is Record<string, any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof ObjectId)
  );
}

/** createdAt falls back to the ObjectId timestamp; updatedAt to createdAt. */
export function timestamps(doc: Record<string, any>, id: string) {
  const createdAt = toDate(doc.createdAt) ?? new ObjectId(id).getTimestamp();
  const updatedAt = toDate(doc.updatedAt) ?? createdAt;
  return { createdAt, updatedAt };
}

/**
 * The runner has no "skip with reason" for checks that need the database, so
 * rows whose owner user was not migrated fail the batch with a message naming
 * the owners; the runner then retries row by row, so only the orphans are
 * reported as failed and every other row is still written.
 */
export async function assertOwnersExist(
  prisma: PrismaClient,
  label: string,
  rows: Array<{ id: string; owner: string }>,
): Promise<void> {
  const owners = [...new Set(rows.map((r) => r.owner))];
  const found = await prisma.user.findMany({
    where: { id: { in: owners } },
    select: { id: true },
  });
  const known = new Set(found.map((u) => u.id));
  const orphans = rows.filter((r) => !known.has(r.owner));
  if (orphans.length > 0) {
    throw new Error(
      `${label}: skipped ${orphans.length} record(s) whose owner user does not exist in Postgres: ` +
        orphans.map((o) => `${o.id} (owner ${o.owner})`).join(', '),
    );
  }
}
