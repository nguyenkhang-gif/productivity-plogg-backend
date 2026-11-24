import { ObjectId } from 'bson';
import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';

export type UserRow = Prisma.UserUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

const GENDERS = ['male', 'female', 'other'] as const;
const MEMBERSHIPS = ['basic', 'advance', 'premium'] as const;
const ROLES = ['user', 'moderator', 'admin'] as const;

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toHexId(value: unknown): string | null {
  const hex =
    value instanceof ObjectId
      ? value.toHexString()
      : typeof value === 'string'
        ? value
        : null;
  return hex && /^[0-9a-f]{24}$/i.test(hex) ? hex.toLowerCase() : null;
}

/**
 * Email and username are copied verbatim: the app matches them exactly
 * (case-sensitive) in both backends, so normalising here would change which
 * logins work. `__v` and any field not in the Postgres schema is dropped.
 * Documents without a usable _id, username or email are skipped.
 */
export function transformUser(doc: Record<string, any>): UserRow | null {
  const id = toHexId(doc._id);
  const username = nonEmptyString(doc.username);
  const email = nonEmptyString(doc.email);
  if (!id || !username || !email) return null;

  const createdAt = toDate(doc.createdAt) ?? new ObjectId(id).getTimestamp();
  const updatedAt = toDate(doc.updatedAt) ?? createdAt;

  return {
    id,
    fullName: nonEmptyString(doc.fullName) ?? username,
    username,
    email,
    passwordHash: typeof doc.passwordHash === 'string' ? doc.passwordHash : '',
    gender: oneOf(doc.gender, GENDERS, 'other'),
    profilePic: nonEmptyString(doc.profilePic),
    membership: oneOf(doc.membership, MEMBERSHIPS, 'basic'),
    role: oneOf(doc.role, ROLES, 'user'),
    isPrivate: doc.isPrivate === true,
    resetPasswordToken: nonEmptyString(doc.resetPasswordToken),
    googleId: nonEmptyString(doc.googleId),
    facebookId: nonEmptyString(doc.facebookId),
    lastSeen: toDate(doc.lastSeen),
    createdAt,
    updatedAt,
  };
}

export const usersMigrator: CollectionMigrator<Record<string, any>, UserRow> = {
  name: 'users',
  collection: 'users',
  dependsOn: [],
  transform: transformUser,
  async upsertBatch(prisma: PrismaClient, rows: UserRow[]) {
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.user.upsert({ where: { id }, create: row, update: data });
      }),
    );
  },
  countTarget: (prisma) => prisma.user.count(),
};
