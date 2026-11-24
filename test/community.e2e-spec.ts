import './support/community-env';
import { randomUUID } from 'crypto';
import { AddressInfo } from 'net';
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as mongoose from 'mongoose';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { REDIS_CLIENT } from '../src/shared/cache/cache.constants';
import { PrismaService } from '../src/shared/database/prisma.service';
import { GuildPermissions } from '../src/modules/community/guild/domain/guild-permissions';
import { DeleteMessageUseCase } from '../src/modules/community/message/application/delete-message.use-case';

const P = GuildPermissions;
const run = Date.now().toString(36);

describe('Community authorization (e2e, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const guildIds: string[] = [];

  const uid = (name: string) => `e2e-${run}-${name}`;
  const token = (sub: string) =>
    jwt.sign(
      { sub, email: `${sub}@test.local`, role: 'user', jti: randomUUID() },
      process.env.JWT_SECRET_KEY as string,
      { expiresIn: '15m' },
    );
  const auth = (sub: string) => ({ Authorization: `Bearer ${token(sub)}` });
  const http = () => request(app.getHttpServer());

  async function createGuild(owner: string, name: string) {
    const res = await http()
      .post('/api/guilds')
      .set(auth(owner))
      .send({ name })
      .expect(201);
    guildIds.push(res.body.id);
    return res.body.id as string;
  }

  async function createChannel(owner: string, guildId: string, name: string) {
    const res = await http()
      .post(`/api/guilds/${guildId}/channels`)
      .set(auth(owner))
      .send({ name })
      .expect(201);
    return res.body.id as string;
  }

  async function invite(owner: string, guildId: string, maxUses?: number) {
    const res = await http()
      .post(`/api/guilds/${guildId}/invites`)
      .set(auth(owner))
      .send(maxUses ? { maxUses } : {})
      .expect(201);
    return res.body.code as string;
  }

  function joinAs(user: string, code: string) {
    return http().post(`/api/invites/${code}/join`).set(auth(user));
  }

  async function addMember(owner: string, guildId: string, user: string) {
    const code = await invite(owner, guildId);
    await joinAs(user, code).expect(201);
  }

  async function createRole(
    actor: string,
    guildId: string,
    body: { name: string; permissions: string; position?: number },
  ) {
    return http()
      .post(`/api/guilds/${guildId}/roles`)
      .set(auth(actor))
      .send(body);
  }

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getConnectionToken())
      .useValue(
        (() => {
          const c = mongoose.createConnection();
          c.set('bufferCommands', false);
          return c;
        })(),
      )
      .compile();
    app = ref.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.listen(0);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      for (const id of guildIds) {
        await prisma.guild.deleteMany({ where: { id } });
      }
    }
    const redis = app?.get(REDIS_CLIENT, { strict: false });
    await app?.close();
    redis?.disconnect();
  });

  describe('guild access', () => {
    let guildId: string;
    let channelId: string;
    const owner = uid('owner');
    const outsider = uid('outsider');

    beforeAll(async () => {
      guildId = await createGuild(owner, 'E2E Access');
      channelId = await createChannel(owner, guildId, 'general');
    });

    it('owner can read channels', async () => {
      const res = await http()
        .get(`/api/guilds/${guildId}/channels`)
        .set(auth(owner))
        .expect(200);
      expect(res.body.map((c: any) => c.id)).toContain(channelId);
    });

    it('outsider cannot read channels or messages', async () => {
      await http()
        .get(`/api/guilds/${guildId}/channels`)
        .set(auth(outsider))
        .expect(403);
      await http()
        .get(`/api/channels/${channelId}/messages`)
        .set(auth(outsider))
        .expect(403);
    });

    it('rejects unauthenticated requests', async () => {
      await http().get(`/api/guilds/${guildId}/channels`).expect(401);
    });

    it('legacy POST /api/guilds/:id/join no longer exists', async () => {
      await http()
        .post(`/api/guilds/${guildId}/join`)
        .set(auth(outsider))
        .expect(404);
    });
  });

  describe('invites', () => {
    it('maxUses=1: first join succeeds, second gets 410', async () => {
      const owner = uid('inv-owner');
      const guildId = await createGuild(owner, 'E2E Invite');
      const code = await invite(owner, guildId, 1);

      await joinAs(uid('inv-first'), code).expect(201);
      await joinAs(uid('inv-second'), code).expect(410);

      const members = await prisma.guildMember.count({ where: { guildId } });
      expect(members).toBe(2);
    });
  });

  describe('role hierarchy', () => {
    const owner = uid('role-owner');
    const plain = uid('role-plain');
    const manager = uid('role-manager');
    const target = uid('role-target');
    let guildId: string;
    let managerRoleId: string;
    let everyoneRoleId: string;

    beforeAll(async () => {
      guildId = await createGuild(owner, 'E2E Roles');
      for (const u of [plain, manager, target]) {
        await addMember(owner, guildId, u);
      }
      const role = await createRole(owner, guildId, {
        name: 'Manager',
        permissions: String(P.MANAGE_ROLES),
        position: 5,
      });
      expect(role.status).toBe(201);
      managerRoleId = role.body.id;
      await http()
        .post(`/api/guilds/${guildId}/members/${manager}/roles`)
        .set(auth(owner))
        .send({ roleId: managerRoleId })
        .expect(201);
      const roles = await http()
        .get(`/api/guilds/${guildId}/roles`)
        .set(auth(owner))
        .expect(200);
      everyoneRoleId = roles.body.find((r: any) => r.isDefault).id;
    });

    it('member without MANAGE_ROLES cannot create a role', async () => {
      const res = await createRole(plain, guildId, {
        name: 'Nope',
        permissions: String(P.SEND_MESSAGES),
      });
      expect(res.status).toBe(403);
    });

    it('MANAGE_ROLES holder can create a lower, in-scope role', async () => {
      const res = await createRole(manager, guildId, {
        name: 'Ok',
        permissions: String(P.SEND_MESSAGES),
        position: 1,
      });
      expect(res.status).toBe(201);
    });

    it('MANAGE_ROLES holder cannot create a role with ADMINISTRATOR', async () => {
      const res = await createRole(manager, guildId, {
        name: 'Admin',
        permissions: String(P.ADMINISTRATOR),
        position: 1,
      });
      expect(res.status).toBe(403);
    });

    it('cannot create or assign a role at or above own position', async () => {
      const atOwn = await createRole(manager, guildId, {
        name: 'Same',
        permissions: '0',
        position: 5,
      });
      expect(atOwn.status).toBe(403);

      const higher = await createRole(owner, guildId, {
        name: 'Higher',
        permissions: '0',
        position: 10,
      });
      expect(higher.status).toBe(201);

      for (const roleId of [managerRoleId, higher.body.id]) {
        await http()
          .post(`/api/guilds/${guildId}/members/${target}/roles`)
          .set(auth(manager))
          .send({ roleId })
          .expect(403);
      }
    });

    it('cannot add MANAGE_* permissions to @everyone', async () => {
      for (const bit of [P.MANAGE_ROLES, P.MANAGE_CHANNELS, P.MANAGE_GUILD]) {
        await http()
          .patch(`/api/guilds/${guildId}/roles/${everyoneRoleId}`)
          .set(auth(manager))
          .send({
            permissions: String(P.VIEW_CHANNELS | P.SEND_MESSAGES | bit),
          })
          .expect(403);
      }
    });
  });

  describe('cross-guild message deletion', () => {
    it('admin of guild B cannot delete a message of guild A via their own channel id', async () => {
      const ownerA = uid('xg-owner-a');
      const adminB = uid('xg-admin-b');
      const guildA = await createGuild(ownerA, 'E2E XG A');
      const guildB = await createGuild(adminB, 'E2E XG B');
      const channelA = await createChannel(ownerA, guildA, 'a');
      const channelB = await createChannel(adminB, guildB, 'b');
      const message = await prisma.message.create({
        data: {
          channelId: channelA,
          senderId: ownerA,
          senderName: 'owner',
          content: 'victim',
        },
      });

      const useCase = app.get(DeleteMessageUseCase, { strict: false });
      await expect(
        useCase.execute(message.id, channelB, adminB),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        useCase.execute(message.id, channelA, adminB),
      ).rejects.toThrow();

      const after = await prisma.message.findUnique({
        where: { id: message.id },
      });
      expect(after?.isDeleted).toBe(false);
    });
  });

  describe('pagination', () => {
    it('clamps ?limit to at most 100 items', async () => {
      const owner = uid('page-owner');
      const guildId = await createGuild(owner, 'E2E Paging');
      const channelId = await createChannel(owner, guildId, 'general');
      await prisma.message.createMany({
        data: Array.from({ length: 105 }, (_, i) => ({
          channelId,
          senderId: owner,
          senderName: 'owner',
          content: `m${i}`,
        })),
      });

      const big = await http()
        .get(`/api/channels/${channelId}/messages?limit=100000`)
        .set(auth(owner))
        .expect(200);
      expect(big.body).toHaveLength(100);

      const small = await http()
        .get(`/api/channels/${channelId}/messages?limit=5`)
        .set(auth(owner))
        .expect(200);
      expect(small.body).toHaveLength(5);
    });
  });

  describe('realtime via domain events', () => {
    const owner = uid('rt-owner');
    const member = uid('rt-member');
    let guildId: string;
    let channelId: string;
    let ownerSocket: Socket;
    let memberSocket: Socket;

    const connect = (user: string) =>
      new Promise<Socket>((resolve, reject) => {
        const { port } = app.getHttpServer().address() as AddressInfo;
        const s = io(`http://127.0.0.1:${port}/guild`, {
          auth: { token: token(user) },
          transports: ['websocket'],
          forceNew: true,
        });
        s.once('connect', () => resolve(s));
        s.once('connect_error', reject);
      });

    const emitAck = (s: Socket, event: string, payload: unknown) =>
      new Promise<any>((resolve) => s.emit(event, payload, resolve));

    const nextEvent = (s: Socket, event: string, ms = 3000) =>
      new Promise<any>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`timeout waiting for ${event}`)),
          ms,
        );
        s.once(event, (data) => {
          clearTimeout(timer);
          resolve(data);
        });
      });

    const silence = (s: Socket, event: string, ms = 600) =>
      new Promise<boolean>((resolve) => {
        let got = false;
        const handler = () => (got = true);
        s.on(event, handler);
        setTimeout(() => {
          s.off(event, handler);
          resolve(!got);
        }, ms);
      });

    beforeAll(async () => {
      guildId = await createGuild(owner, 'E2E Realtime');
      channelId = await createChannel(owner, guildId, 'general');
      await addMember(owner, guildId, member);

      ownerSocket = await connect(owner);
      memberSocket = await connect(member);
      for (const s of [ownerSocket, memberSocket]) {
        await emitAck(s, 'join_guild', { guildId });
        const ack = await emitAck(s, 'join_channel', { channelId });
        expect(ack.status).toBe('channel_ready');
      }
    });

    afterAll(() => {
      ownerSocket?.disconnect();
      memberSocket?.disconnect();
    });

    it('delivers new_message to members of channel:<id>', async () => {
      const received = nextEvent(memberSocket, 'new_message');
      ownerSocket.emit('send_message', { channelId, content: 'hello' });
      const msg = await received;
      expect(msg.content).toBe('hello');
      expect(msg.channelId).toBe(channelId);
    });

    it('broadcasts REST channel creation to the guild room', async () => {
      const created = nextEvent(memberSocket, 'channel_created');
      const newId = await createChannel(owner, guildId, 'second');
      expect((await created).id).toBe(newId);
    });

    it('stops delivering to a kicked member', async () => {
      const kicked = nextEvent(memberSocket, 'member_kicked');
      await http()
        .delete(`/api/guilds/${guildId}/members/${member}`)
        .set(auth(owner))
        .expect(204);
      expect((await kicked).userId).toBe(member);

      const quiet = silence(memberSocket, 'new_message');
      await new Promise((r) => setTimeout(r, 200));
      ownerSocket.emit('send_message', { channelId, content: 'after kick' });
      expect(await quiet).toBe(true);
    });
  });
});
