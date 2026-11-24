import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/infrastructure/databases/prisma/prisma.service';
import { GuildInvitePrismaRepository } from 'src/infrastructure/databases/repositories/guild-invite.prisma.repository';

describe('GuildInvitePrismaRepository.joinWithInvite (integration)', () => {
  let prisma: PrismaService;
  let repo: GuildInvitePrismaRepository;
  let guildId: string;

  const join = (code: string, userId: string) =>
    repo.joinWithInvite({ code, guildId, userId, username: userId });

  const invite = (code: string, data: { maxUses?: number; expiresAt?: Date }) =>
    prisma.guildInvite.create({
      data: { code, guildId, createdBy: 'owner-1', ...data },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new GuildInvitePrismaRepository(prisma);
    const guild = await prisma.guild.create({
      data: { name: 'Invite Integration Guild', ownerId: 'owner-1' },
    });
    guildId = guild.id;
  });

  afterAll(async () => {
    await prisma.guild.delete({ where: { id: guildId } });
    await prisma.onModuleDestroy();
  });

  it('stops accepting joins once maxUses is reached', async () => {
    await invite(`max-${guildId}`, { maxUses: 1 });
    await expect(join(`max-${guildId}`, 'a1')).resolves.toBe('joined');
    await expect(join(`max-${guildId}`, 'a2')).resolves.toBe('unavailable');
  });

  it('rejects expired invites', async () => {
    await invite(`exp-${guildId}`, { expiresAt: new Date(Date.now() - 1000) });
    await expect(join(`exp-${guildId}`, 'b1')).resolves.toBe('unavailable');
  });

  it('does not consume a use when the user is already a member', async () => {
    const code = `dup-${guildId}`;
    await invite(code, { maxUses: 2 });
    await expect(join(code, 'c1')).resolves.toBe('joined');
    await expect(join(code, 'c1')).resolves.toBe('already_member');
    const row = await prisma.guildInvite.findUnique({ where: { code } });
    expect(row?.uses).toBe(1);
  });

  it('admits exactly maxUses members under concurrent joins', async () => {
    const code = `race-${guildId}`;
    await invite(code, { maxUses: 1 });
    const results = await Promise.all(
      ['r1', 'r2', 'r3', 'r4', 'r5'].map((u) => join(code, u)),
    );
    expect(results.filter((r) => r === 'joined')).toHaveLength(1);
    const row = await prisma.guildInvite.findUnique({ where: { code } });
    expect(row?.uses).toBe(1);
  });
});
