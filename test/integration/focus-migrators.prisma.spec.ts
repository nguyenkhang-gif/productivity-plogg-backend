import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { ObjectId } from 'bson';
import { PrismaService } from 'src/shared/database/prisma.service';
import {
  type CollectionMigrator,
  type MigrationSource,
  runMigrators,
} from 'src/scripts/migrate-mongo-to-postgres/migrator';
import { MIGRATORS } from 'src/scripts/migrate-mongo-to-postgres/registry';

class FakeSource implements MigrationSource {
  constructor(private readonly data: Record<string, any[]>) {}
  async count(collection: string) {
    return (this.data[collection] ?? []).length;
  }
  async *read(collection: string, batchSize: number) {
    const docs = this.data[collection] ?? [];
    for (let i = 0; i < docs.length; i += batchSize) {
      yield docs.slice(i, i + batchSize);
    }
  }
}

describe('productivity migrators (integration)', () => {
  let prisma: PrismaService;
  const tag = new ObjectId().toHexString().slice(-8);
  const userIds: string[] = [];
  const ghost = new ObjectId().toHexString(); // never inserted into Postgres

  const NAMES = [
    'focus-sessions-raw',
    'focus-rollups-daily',
    'focus-rollups-weekly',
    'focus-rollups-monthly',
    'user-progress',
    'encrypted-vaults',
  ];

  /** Counts only this run's rows so the shared DB does not skew verification. */
  const scoped = (): CollectionMigrator[] => {
    const where = { userId: { in: userIds } };
    const counts: Record<string, () => Promise<number>> = {
      'focus-sessions-raw': () => prisma.focusSessionRaw.count({ where }),
      'focus-rollups-daily': () => prisma.focusRollupDaily.count({ where }),
      'focus-rollups-weekly': () => prisma.focusRollupWeekly.count({ where }),
      'focus-rollups-monthly': () => prisma.focusRollupMonthly.count({ where }),
      'user-progress': () => prisma.userProgress.count({ where }),
      'encrypted-vaults': () => prisma.encryptedVault.count({ where }),
    };
    return MIGRATORS.filter((m) => NAMES.includes(m.name)).map((m) => ({
      ...m,
      dependsOn: [],
      countTarget: counts[m.name] as any,
    }));
  };

  const data = () => {
    const [u1, u2] = userIds;
    const raw = (user: string, cs: string, date: string, min: number) => ({
      _id: new ObjectId(),
      userId: user,
      clientSessionId: cs,
      completedAt: new Date(`${date}T10:00:00Z`),
      localDate: date,
      durationMin: min,
      xpEarned: min,
    });
    return {
      focus_sessions_raw: [
        raw(u1, `m-${tag}-1`, '2026-07-05', 25),
        raw(u1, `m-${tag}-2`, '2026-07-05', 30),
        raw(u2, `m-${tag}-3`, '2026-07-06', 10),
        raw(ghost, `m-${tag}-4`, '2026-07-06', 10),
        { ...raw(u1, `m-${tag}-5`, 'bad-date', 10) },
      ],
      focus_sessions_daily: [
        {
          _id: new ObjectId(),
          userId: u1,
          date: '2026-07-05',
          sessionsCount: 2,
          totalFocusMin: 55,
          totalXp: 55,
          createdAt: new Date('2026-07-06T00:05:00Z'),
        },
        {
          _id: new ObjectId(),
          userId: ghost,
          date: '2026-07-05',
          sessionsCount: 1,
          totalFocusMin: 5,
          totalXp: 5,
          createdAt: new Date('2026-07-06T00:05:00Z'),
        },
      ],
      focus_sessions_weekly: [
        {
          _id: new ObjectId(),
          userId: u1,
          weekStart: '2026-06-29',
          sessionsCount: 2,
          totalFocusMin: 55,
          totalXp: 55,
        },
      ],
      focus_sessions_monthly: [
        {
          _id: new ObjectId(),
          userId: u2,
          month: '2026-06',
          sessionsCount: 9,
          totalFocusMin: 90,
          totalXp: 90,
        },
      ],
      user_progress: [
        {
          _id: new ObjectId(),
          userId: u1,
          totalXp: 55,
          totalFocusMin: 55,
          tzOffset: 420,
          lastActiveLocalDate: '2026-07-05',
          currentStreak: 2,
          longestStreak: 3,
        },
        { _id: new ObjectId(), userId: ghost, totalXp: 1 },
      ],
      encrypted_vaults: [
        {
          _id: new ObjectId(),
          userId: u1,
          scope: 'tasks',
          ciphertext: 'c2VjcmV0',
          iv: 'AAAAAAAAAAAAAAAA',
          wrappedKey: 'd3JhcHBlZA==',
          kdf: { algo: 'PBKDF2-SHA256', salt: 'c2FsdA==', iterations: 600000 },
          version: 4,
        },
        {
          _id: new ObjectId(),
          userId: ghost,
          scope: 'tasks',
          ciphertext: 'c2VjcmV0',
          iv: 'AAAAAAAAAAAAAAAA',
          wrappedKey: 'd3JhcHBlZA==',
          kdf: { algo: 'PBKDF2-SHA256', salt: 'c2FsdA==', iterations: 1 },
        },
      ],
    };
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    for (let i = 0; i < 2; i++) {
      const id = new ObjectId().toHexString();
      userIds.push(id);
      await prisma.user.create({
        data: {
          id,
          fullName: `Mig ${i}`,
          username: `prodmig_${tag}_${i}`,
          email: `prodmig_${tag}_${i}@example.com`,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.onModuleDestroy();
  });

  it('migrates valid rows, skips orphans/invalid with reasons, and verifies', async () => {
    const lines: string[] = [];
    const results = await runMigrators(
      scoped(),
      new FakeSource(data()),
      prisma,
      { log: (l) => lines.push(l) },
    );
    const by = Object.fromEntries(results.map((r) => [r.name, r]));

    expect(by['focus-sessions-raw']).toMatchObject({
      read: 5,
      written: 3,
      skipped: 2, // one orphan user + one malformed localDate
      failed: 0,
      verified: true,
    });
    expect(by['focus-rollups-daily']).toMatchObject({
      written: 1,
      skipped: 1,
      verified: true,
    });
    expect(by['focus-rollups-weekly']).toMatchObject({
      written: 1,
      verified: true,
    });
    expect(by['focus-rollups-monthly']).toMatchObject({
      written: 1,
      verified: true,
    });
    expect(by['user-progress']).toMatchObject({
      written: 1,
      skipped: 1,
      verified: true,
    });
    expect(by['encrypted-vaults']).toMatchObject({
      written: 1,
      skipped: 1,
      verified: true,
    });
    expect(lines.some((l) => l.includes(`user ${ghost} does not exist`))).toBe(
      true,
    );
    // payloads never appear in the log
    expect(lines.join('\n')).not.toContain('c2VjcmV0');

    const vault = await prisma.encryptedVault.findFirstOrThrow({
      where: { userId: userIds[0] },
    });
    expect(vault).toMatchObject({ version: 4, ciphertext: 'c2VjcmV0' });
    expect(vault.kdf).toEqual({
      algo: 'PBKDF2-SHA256',
      salt: 'c2FsdA==',
      iterations: 600000,
    });
    const progress = await prisma.userProgress.findUniqueOrThrow({
      where: { userId: userIds[0] },
    });
    expect(progress).toMatchObject({
      totalXp: 55,
      tzOffset: 420,
      longestStreak: 3,
    });
  });

  it('is idempotent: a second run converges on the same rows', async () => {
    const docs = data();
    // keep the same _ids as the first run for the keyed-by-id collections
    const first = await prisma.focusSessionRaw.findMany({
      where: { userId: { in: userIds } },
    });
    expect(first).toHaveLength(3);

    const src = new FakeSource({
      ...docs,
      // ids of these two are fresh in data(); real re-runs keep Mongo's _ids
      user_progress: [],
      encrypted_vaults: [],
      focus_sessions_raw: first.map((r) => ({
        ...r,
        _id: new ObjectId(r.id),
        durationMin: r.durationMin + 1, // changed in Mongo since
      })),
    });
    const results = await runMigrators(scoped(), src, prisma);
    expect(results.every((r) => r.failed === 0)).toBe(true);
    expect(
      await prisma.focusSessionRaw.count({
        where: { userId: { in: userIds } },
      }),
    ).toBe(3);
    const updated = await prisma.focusSessionRaw.findUniqueOrThrow({
      where: { id: first[0].id },
    });
    expect(updated.durationMin).toBe(first[0].durationMin + 1);
    expect(
      await prisma.focusRollupDaily.count({
        where: { userId: { in: userIds } },
      }),
    ).toBe(1);
  });

  it('dry run counts but writes nothing', async () => {
    const [u1] = userIds;
    const before = await prisma.userProgress.count({ where: { userId: u1 } });
    const results = await runMigrators(
      scoped().filter((m) => m.name === 'user-progress'),
      new FakeSource({
        user_progress: [{ _id: new ObjectId(), userId: ghost }],
      }),
      prisma,
      { dryRun: true },
    );
    expect(results[0]).toMatchObject({ written: 0, skipped: 1 });
    expect(await prisma.userProgress.count({ where: { userId: u1 } })).toBe(
      before,
    );
  });
});
