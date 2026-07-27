/**
 * Integration test — chạy vào Postgres THẬT (không mock Prisma).
 *
 * Dùng POSTGRES_URL hiện có trong .env (không tách DB test riêng).
 * Test tự tạo + tự xóa data của chính nó (guild riêng, cascade xóa
 * hết member) nên không để lại rác — nhưng vẫn ghi/xóa thật vào DB
 * đang trỏ trong .env, cân nhắc nếu đó là DB có data thật quan trọng.
 *
 * Chạy: npm run test:integration
 */
import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/infrastructure/databases/prisma/prisma.service';
import { GuildMemberPrismaRepository } from 'src/infrastructure/databases/repositories/guild-member.prisma.repository';

describe('GuildMemberPrismaRepository.findByGuild (integration)', () => {
  let prisma: PrismaService;
  let repo: GuildMemberPrismaRepository;
  let guildId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new GuildMemberPrismaRepository(prisma);

    const guild = await prisma.guild.create({
      data: { name: 'Integration Test Guild', ownerId: 'owner-1' },
    });
    guildId = guild.id;

    await prisma.guildMember.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        guildId,
        userId: `user-${i}`,
        username: `user${i}`,
      })),
    });
  });

  afterAll(async () => {
    await prisma.guild.delete({ where: { id: guildId } }); // cascade xóa guild_members
    await prisma.onModuleDestroy();
  });

  it('returns all members when no limit is passed (default 50)', async () => {
    const members = await repo.findByGuild(guildId);
    expect(members).toHaveLength(5);
  });

  it('respects the limit parameter', async () => {
    const page = await repo.findByGuild(guildId, undefined, 2);
    expect(page).toHaveLength(2);
  });

  it('cursor continues from the last item without overlap or gaps', async () => {
    const page1 = await repo.findByGuild(guildId, undefined, 2);
    const page1Ids = page1.map((m) => m.userId);

    const cursor = page1Ids[page1Ids.length - 1];
    const page2 = await repo.findByGuild(guildId, cursor, 2);
    const page2Ids = page2.map((m) => m.userId);

    const page3 = await repo.findByGuild(
      guildId,
      page2Ids[page2Ids.length - 1],
      2,
    );
    const page3Ids = page3.map((m) => m.userId);

    const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
    expect(new Set(allIds).size).toBe(allIds.length); // không trùng lặp
    expect(allIds).toHaveLength(5); // đủ hết 5 member, không thiếu
  });

  it('returns an empty array for a guild with no members', async () => {
    const emptyGuild = await prisma.guild.create({
      data: { name: 'Empty Guild', ownerId: 'owner-2' },
    });

    const members = await repo.findByGuild(emptyGuild.id);
    expect(members).toEqual([]);

    await prisma.guild.delete({ where: { id: emptyGuild.id } });
  });
});
