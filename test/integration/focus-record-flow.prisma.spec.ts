import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { RecordFocusSessionUseCase } from 'src/modules/productivity/focus/application/record-focus-session.use-case';
import { GetFocusReportUseCase } from 'src/modules/productivity/focus/application/get-focus-report.use-case';
import { PrismaFocusSessionRepository } from 'src/modules/productivity/focus/infrastructure/focus-session.prisma.repository';
import { PrismaUserProgressRepository } from 'src/modules/productivity/focus/infrastructure/user-progress.prisma.repository';

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

/** Use-cases wired to the real Postgres repositories. */
describe('Focus recording flow: Prisma', () => {
  let ctx: Awaited<ReturnType<typeof boot>>;
  let record: RecordFocusSessionUseCase;
  let report: GetFocusReportUseCase;
  let progress: PrismaUserProgressRepository;

  beforeAll(async () => {
    ctx = await boot();
    progress = new PrismaUserProgressRepository(ctx.prisma);
    const sessions = new PrismaFocusSessionRepository(ctx.prisma);
    record = new RecordFocusSessionUseCase(progress, sessions);
    report = new GetFocusReportUseCase(sessions);
  });

  afterAll(() => ctx.cleanup());

  it('N parallel distinct recordings: totals, raw rows and report all sum', async () => {
    const userId = await ctx.newUser();
    const n = 12;
    const results = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        record.execute(userId, {
          clientSessionId: `parallel-${i}-${userId}`,
          durationMin: 5,
          tzOffset: 0,
        }),
      ),
    );
    expect(results.every((r) => !r.alreadyRecorded)).toBe(true);

    const p = await progress.findByUserId(userId);
    expect(p!.totalXp).toBe(5 * n);
    expect(p!.totalFocusMin).toBe(5 * n);

    const month = new Date().toISOString().slice(0, 7);
    const { cells } = await report.execute(userId, { month });
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({
      sessionsCount: n,
      totalFocusMin: 5 * n,
      totalXp: 5 * n,
    });
    expect(Object.keys(cells[0]).sort()).toEqual([
      'period',
      'sessionsCount',
      'totalFocusMin',
      'totalXp',
    ]);
  });

  it('replaying a clientSessionId is reported as already recorded and not double counted', async () => {
    const userId = await ctx.newUser();
    const dto = { clientSessionId: `replay-${userId}`, durationMin: 30 };
    const first = await record.execute(userId, dto);
    const again = await record.execute(userId, dto);
    expect(first.alreadyRecorded).toBe(false);
    expect(again.alreadyRecorded).toBe(true);
    expect((await progress.findByUserId(userId))!.totalXp).toBe(30);
  });
});
