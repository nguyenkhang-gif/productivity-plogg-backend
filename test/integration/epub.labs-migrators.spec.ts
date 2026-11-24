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
  MigrationSource,
  hasFailures,
  runMigrators,
} from 'src/scripts/migrate-mongo-to-postgres/migrator';
import { usersMigrator } from 'src/scripts/migrate-mongo-to-postgres/migrators/users.migrator';
import { epubMigrator } from 'src/scripts/migrate-mongo-to-postgres/migrators/epub.migrator';
import { storyContextMigrator } from 'src/scripts/migrate-mongo-to-postgres/migrators/story-context.migrator';
import { translationContextMigrator } from 'src/scripts/migrate-mongo-to-postgres/migrators/translation-context.migrator';
import { mailLogMigrator } from 'src/scripts/migrate-mongo-to-postgres/migrators/mail-log.migrator';

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

describe('labs migrators (integration)', () => {
  let prisma: PrismaService;
  const tag = new ObjectId().toHexString().slice(-8);
  const ownerId = new ObjectId().toHexString();
  const ghostId = new ObjectId().toHexString();
  const mailTo = `contract_migr_${tag}@example.com`;
  const ids = {
    epub: new ObjectId(),
    orphanEpub: new ObjectId(),
    story: new ObjectId(),
    orphanStory: new ObjectId(),
    translation: new ObjectId(),
    mail: new ObjectId(),
  };
  const styleGuide = {
    formality: 'f',
    keepHonorifics: true,
    keepOriginalNames: true,
    chapterLabel: 'Chương',
  };

  const source = () =>
    new FakeSource({
      epubs: [
        {
          _id: ids.epub,
          createdUserId: ownerId,
          sampleUrl: 'https://x/e.epub',
          properties: { a: { b: [1, 2] } },
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
        { _id: ids.orphanEpub, createdUserId: ghostId, properties: {} },
      ],
      storycontexts: [
        {
          _id: ids.story,
          userId: ownerId,
          title: 'S',
          author: 'A',
          genre: 'g',
          setting: 's',
          targetTone: 't',
          styleGuide,
          characters: [{ name: 'N' }],
        },
        {
          _id: ids.orphanStory,
          userId: ghostId,
          title: 'S',
          styleGuide,
        },
      ],
      translationcontexts: [
        {
          _id: ids.translation,
          userId: ownerId,
          title: 'T',
          genre: 'g',
          setting: 's',
          targetTone: 't',
          styleGuide,
        },
      ],
      maillogs: [
        {
          _id: ids.mail,
          to: mailTo,
          subject: 's',
          body: 'b',
          status: 'sent',
          sentAt: new Date('2024-03-01T00:00:00.000Z'),
        },
      ],
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    await prisma.user.create({
      data: {
        id: ownerId,
        fullName: 'Migr Owner',
        username: `contract_migr_${tag}`,
        email: `contract_migr_${tag}@example.com`,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: ownerId } }); // cascades
    await prisma.mailLog.deleteMany({ where: { to: mailTo } });
    await prisma.onModuleDestroy();
  });

  const scopedMigrators = () => [
    usersMigrator,
    {
      ...epubMigrator,
      countTarget: (p: any) =>
        p.epub.count({ where: { createdUserId: ownerId } }),
    },
    {
      ...storyContextMigrator,
      countTarget: (p: any) =>
        p.storyContext.count({ where: { userId: ownerId } }),
    },
    {
      ...translationContextMigrator,
      countTarget: (p: any) =>
        p.translationContext.count({ where: { userId: ownerId } }),
    },
    {
      ...mailLogMigrator,
      countTarget: (p: any) => p.mailLog.count({ where: { to: mailTo } }),
    },
  ];

  it('writes valid rows, reports owner-less rows as failed with a reason, and is idempotent', async () => {
    const run = () =>
      runMigrators(scopedMigrators(), source(), prisma, {
        batchSize: 10,
        only: ['epubs', 'story-contexts', 'translation-contexts', 'mail-logs'],
      });

    const first = await run();
    const byName = Object.fromEntries(first.map((r) => [r.name, r]));

    expect(byName['epubs']).toMatchObject({ read: 2, written: 1, failed: 1 });
    expect(byName['epubs'].errors[0]).toContain(ids.orphanEpub.toHexString());
    expect(byName['epubs'].errors[0]).toContain('owner user does not exist');
    expect(byName['story-contexts']).toMatchObject({ written: 1, failed: 1 });
    expect(byName['translation-contexts']).toMatchObject({
      written: 1,
      failed: 0,
      verified: true,
    });
    expect(byName['mail-logs']).toMatchObject({
      written: 1,
      failed: 0,
      verified: true,
    });
    expect(hasFailures(first)).toBe(true);

    const epub = await prisma.epub.findUnique({
      where: { id: ids.epub.toHexString() },
    });
    expect(epub).toMatchObject({
      createdUserId: ownerId,
      sampleUrl: 'https://x/e.epub',
      properties: { a: { b: [1, 2] } },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });
    expect(
      await prisma.epub.findUnique({
        where: { id: ids.orphanEpub.toHexString() },
      }),
    ).toBeNull();
    expect(
      await prisma.mailLog.findUnique({
        where: { id: ids.mail.toHexString() },
      }),
    ).toMatchObject({ to: mailTo, status: 'sent' });

    // re-run converges on the same state
    await run();
    expect(await prisma.epub.count({ where: { createdUserId: ownerId } })).toBe(
      1,
    );
    expect(
      await prisma.storyContext.count({ where: { userId: ownerId } }),
    ).toBe(1);
    expect(await prisma.mailLog.count({ where: { to: mailTo } })).toBe(1);
  });
});
