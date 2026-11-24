import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { PrismaFocusSessionRepository } from 'src/modules/productivity/focus/infrastructure/focus-session.prisma.repository';
import { describeFocusSessionRepositoryContract } from '../contracts/focus-session-repository.contract';

async function boot() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const userIds: string[] = [];
  const newUser = async () => {
    const id = newObjectId();
    userIds.push(id);
    await prisma.user.create({
      data: {
        id,
        fullName: `Prod Test ${id}`,
        username: `prodtest_${id}`,
        email: `prodtest_${id}@example.com`,
      },
    });
    return id;
  };
  const cleanup = async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.onModuleDestroy();
  };
  return { prisma, newUser, cleanup };
}

const pick = (
  key: string,
  r: { sessionsCount: number; totalFocusMin: number; totalXp: number },
) => ({
  key,
  sessionsCount: r.sessionsCount,
  totalFocusMin: r.totalFocusMin,
  totalXp: r.totalXp,
});

describeFocusSessionRepositoryContract('Prisma', async () => {
  const { prisma, newUser, cleanup } = await boot();
  return {
    repo: new PrismaFocusSessionRepository(prisma),
    newUser,
    cleanup,
    readRollups: async (kind, userId) => {
      if (kind === 'daily') {
        const rows = await prisma.focusRollupDaily.findMany({
          where: { userId },
          orderBy: { date: 'asc' },
        });
        return rows.map((r) => pick(r.date, r));
      }
      if (kind === 'weekly') {
        const rows = await prisma.focusRollupWeekly.findMany({
          where: { userId },
          orderBy: { weekStart: 'asc' },
        });
        return rows.map((r) => pick(r.weekStart, r));
      }
      const rows = await prisma.focusRollupMonthly.findMany({
        where: { userId },
        orderBy: { month: 'asc' },
      });
      return rows.map((r) => pick(r.month, r));
    },
  };
});
