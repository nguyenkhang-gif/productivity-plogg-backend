import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';
import { optionalText, text, timestamps, toDate, toHexId } from './labs-common';

export type MailLogRow = Prisma.MailLogUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

const STATUSES = ['sent', 'failed'] as const;

/**
 * Mail logs have no owner, so none are dropped for a missing user. Documents
 * without a usable _id, recipient or a valid status are skipped. `sentAt`
 * falls back to createdAt, then to the ObjectId timestamp.
 */
export function transformMailLog(doc: Record<string, any>): MailLogRow | null {
  const id = toHexId(doc._id);
  const to = optionalText(doc.to);
  const status = (STATUSES as readonly string[]).includes(doc.status)
    ? (doc.status as (typeof STATUSES)[number])
    : null;
  if (!id || !to || !status) return null;

  const stamps = timestamps(doc, id);
  return {
    id,
    to,
    subject: text(doc.subject),
    body: text(doc.body),
    status,
    error: optionalText(doc.error),
    sentAt: toDate(doc.sentAt) ?? stamps.createdAt,
    ...stamps,
  };
}

export const mailLogMigrator: CollectionMigrator<
  Record<string, any>,
  MailLogRow
> = {
  name: 'mail-logs',
  collection: 'maillogs',
  dependsOn: [],
  transform: transformMailLog,
  async upsertBatch(prisma: PrismaClient, rows: MailLogRow[]) {
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.mailLog.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
  },
  countTarget: (prisma) => prisma.mailLog.count(),
};
