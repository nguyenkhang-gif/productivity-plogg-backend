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
  CollectionMigrator,
  MigrationSource,
  hasFailures,
  orderMigrators,
  runMigrators,
} from 'src/scripts/migrate-mongo-to-postgres/migrator';
import { usersMigrator } from 'src/scripts/migrate-mongo-to-postgres/migrators/users.migrator';

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

describe('migration runner (integration)', () => {
  let prisma: PrismaService;
  const tag = new ObjectId().toHexString().slice(-8);
  const createdIds: string[] = [];

  const userDoc = (n: number, extra: Record<string, any> = {}) => {
    const _id = new ObjectId();
    createdIds.push(_id.toHexString());
    return {
      _id,
      fullName: `Runner User ${n}`,
      username: `runner_${tag}_${n}`,
      email: `runner_${tag}_${n}@example.com`,
      passwordHash: 'h',
      createdAt: new Date('2024-05-01T00:00:00.000Z'),
      updatedAt: new Date('2024-05-02T00:00:00.000Z'),
      __v: 0,
      ...extra,
    };
  };

  const scoped = (): CollectionMigrator => ({
    ...usersMigrator,
    countTarget: (p) =>
      p.user.count({ where: { username: { startsWith: `runner_${tag}_` } } }),
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.onModuleDestroy();
  });

  it('writes in batches, is idempotent and picks up changed documents on re-run', async () => {
    const docs = [1, 2, 3, 4, 5].map((n) => userDoc(n));
    const source = new FakeSource({ users: docs });

    const first = await runMigrators([scoped()], source, prisma, {
      batchSize: 2,
    });
    expect(first[0]).toMatchObject({
      read: 5,
      written: 5,
      skipped: 0,
      failed: 0,
      sourceCount: 5,
      targetCount: 5,
      verified: true,
    });

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: docs[0]._id.toHexString() },
    });
    expect(stored.createdAt).toEqual(docs[0].createdAt);
    expect(stored.updatedAt).toEqual(docs[0].updatedAt);

    docs[0].fullName = 'Renamed In Mongo';
    const second = await runMigrators([scoped()], source, prisma, {
      batchSize: 3,
    });
    expect(second[0]).toMatchObject({
      written: 5,
      failed: 0,
      targetCount: 5,
      verified: true,
    });
    const renamed = await prisma.user.findUniqueOrThrow({
      where: { id: docs[0]._id.toHexString() },
    });
    expect(renamed.fullName).toBe('Renamed In Mongo');
  });

  it('isolates a failing row, counts skips and exits non-zero', async () => {
    const good = userDoc(10);
    const duplicateEmail = userDoc(11, { email: good.email });
    const unusable = { _id: new ObjectId(), username: 'no-email' };
    const source = new FakeSource({ users: [good, duplicateEmail, unusable] });

    const [stats] = await runMigrators([scoped()], source, prisma, {
      batchSize: 10,
    });
    expect(stats).toMatchObject({
      read: 3,
      written: 1,
      skipped: 1,
      failed: 1,
    });
    expect(stats.errors).toHaveLength(1);
    expect(hasFailures([stats])).toBe(true);
    expect(
      await prisma.user.findUnique({ where: { id: good._id.toHexString() } }),
    ).not.toBeNull();
  });

  it('dry run transforms but writes nothing', async () => {
    const doc = userDoc(20);
    const [stats] = await runMigrators(
      [scoped()],
      new FakeSource({ users: [doc] }),
      prisma,
      { dryRun: true },
    );
    expect(stats).toMatchObject({ read: 1, written: 1, verified: null });
    expect(
      await prisma.user.findUnique({ where: { id: doc._id.toHexString() } }),
    ).toBeNull();
  });

  it('orders migrators by dependency and honours --only', () => {
    const make = (name: string, dependsOn: string[]): CollectionMigrator => ({
      ...usersMigrator,
      name,
      dependsOn,
    });
    const migrators = [
      make('comments', ['posts']),
      make('posts', ['users']),
      make('users', []),
    ];
    expect(orderMigrators(migrators).map((m) => m.name)).toEqual([
      'users',
      'posts',
      'comments',
    ]);
    expect(
      orderMigrators(migrators, ['comments', 'users']).map((m) => m.name),
    ).toEqual(['users', 'comments']);
    expect(() => orderMigrators(migrators, ['nope'])).toThrow(/Unknown/);
    expect(() => orderMigrators([make('a', ['b']), make('b', ['a'])])).toThrow(
      /Circular/,
    );
  });
});
