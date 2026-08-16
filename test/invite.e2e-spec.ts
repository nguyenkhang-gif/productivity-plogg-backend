/**
 * E2E — Invite flow (MVP): create → preview → join.
 *
 * Bắn HTTP thật qua supertest vào AppModule. Tự tạo guild + owner + role
 * @everyone trong beforeAll, xóa sạch (cascade) trong afterAll → không để
 * lại rác. Dùng POSTGRES_URL trong .env (DB dev).
 *
 * JWT ký trực tiếp bằng JWT_SECRET_KEY, KHÔNG kèm jti → né check blacklist
 * (Redis) trong JwtStrategy, nên test chạy được kể cả khi Redis không có.
 *
 * Chạy: npm run test:e2e
 */
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/infrastructure/databases/prisma/prisma.service';
import { GuildPermissions } from './../src/core/domain/constants/guild-permissions';

describe('Invite flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let guildId: string;

  const secret = process.env.JWT_SECRET_KEY as string;
  const ownerId = `e2e-owner-${Date.now()}`;
  const joinerId = `e2e-joiner-${Date.now()}`;
  const sign = (sub: string) =>
    jwt.sign({ sub, email: `${sub}@test.local`, role: 'user' }, secret); // không jti → skip blacklist
  const ownerAuth = () => `Bearer ${sign(ownerId)}`;
  const joinerAuth = () => `Bearer ${sign(joinerId)}`;

  let code: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Fixture: guild (owner = ownerId) + owner làm member + role @everyone default.
    const guild = await prisma.guild.create({
      data: { name: 'E2E Invite Guild', ownerId },
    });
    guildId = guild.id;
    await prisma.guildMember.create({
      data: { guildId, userId: ownerId, username: 'e2e-owner' },
    });
    await prisma.role.create({
      data: {
        guildId,
        name: '@everyone',
        permissions:
          GuildPermissions.VIEW_CHANNELS | GuildPermissions.SEND_MESSAGES,
        isDefault: true,
        position: 0,
      },
    });
  });

  afterAll(async () => {
    if (guildId) await prisma.guild.delete({ where: { id: guildId } }); // cascade
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('owner tạo được invite → 201 + code', async () => {
    const res = await http()
      .post(`/api/guilds/${guildId}/invites`)
      .set('Authorization', ownerAuth())
      .expect(201);
    expect(typeof res.body.code).toBe('string');
    expect(res.body.code.length).toBeGreaterThanOrEqual(6);
    code = res.body.code;
  });

  it('preview trả đúng guild, chỉ lộ tối thiểu', async () => {
    const res = await http()
      .get(`/api/invites/${code}`)
      .set('Authorization', joinerAuth())
      .expect(200);
    expect(res.body.guild.name).toBe('E2E Invite Guild');
    expect(res.body.guild.memberCount).toBeGreaterThanOrEqual(1);
    expect(res.body.guild.channels).toBeUndefined(); // không lộ channel/member
  });

  it('joiner CHƯA là member → GET guild 403', () =>
    http()
      .get(`/api/guilds/${guildId}`)
      .set('Authorization', joinerAuth())
      .expect(403));

  it('joiner join qua code → 201 + guildId', async () => {
    const res = await http()
      .post(`/api/invites/${code}/join`)
      .set('Authorization', joinerAuth())
      .expect(201);
    expect(res.body.guildId).toBe(guildId);
  });

  it('sau join joiner xem được guild + nhận quyền @everyone (myPermissions=3)', async () => {
    const res = await http()
      .get(`/api/guilds/${guildId}`)
      .set('Authorization', joinerAuth())
      .expect(200);
    expect(res.body.myPermissions).toBe('3');
  });

  it('join lại idempotent → 201, không nhân đôi member', async () => {
    await http()
      .post(`/api/invites/${code}/join`)
      .set('Authorization', joinerAuth())
      .expect(201);
    const count = await prisma.guildMember.count({
      where: { guildId, userId: joinerId },
    });
    expect(count).toBe(1);
  });

  it('code sai → 404', () =>
    http()
      .get('/api/invites/notexist')
      .set('Authorization', joinerAuth())
      .expect(404));

  it('joiner (không MANAGE_GUILD) tạo invite → 403', () =>
    http()
      .post(`/api/guilds/${guildId}/invites`)
      .set('Authorization', joinerAuth())
      .expect(403));
});
