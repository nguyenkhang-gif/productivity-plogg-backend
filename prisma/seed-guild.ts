process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { PrismaClient, ChannelType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const isLocal = (process.env.POSTGRES_URL ?? '').includes('localhost');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// Fake MongoDB User IDs để test (thay bằng _id thật khi có)
const USERS = [
  { id: 'user_001', username: 'khang', avatar: 'https://i.pravatar.cc/150?u=khang' },
  { id: 'user_002', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=alice' },
  { id: 'user_003', username: 'bob',   avatar: 'https://i.pravatar.cc/150?u=bob'   },
];

const GuildPermissions = {
  VIEW_CHANNELS:   1n << 0n,
  SEND_MESSAGES:   1n << 1n,
  MANAGE_MESSAGES: 1n << 2n,
  MANAGE_CHANNELS: 1n << 3n,
  MANAGE_GUILD:    1n << 4n,
  KICK_MEMBERS:    1n << 5n,
  BAN_MEMBERS:     1n << 6n,
  MANAGE_ROLES:    1n << 7n,
  ADMINISTRATOR:   1n << 8n,
};

async function main() {
  console.log('🌱 Seeding guild data...');

  // ── 1. Tạo Guild ──────────────────────────────────────────────
  const guild = await prisma.guild.create({
    data: {
      name: 'Plog Dev Server',
      icon: '🚀',
      ownerId: USERS[0].id,
    },
  });
  console.log(`✅ Guild: ${guild.name} (${guild.id})`);

  // ── 2. Tạo Roles ──────────────────────────────────────────────
  const adminPerms =
    GuildPermissions.ADMINISTRATOR;

  const memberPerms =
    GuildPermissions.VIEW_CHANNELS |
    GuildPermissions.SEND_MESSAGES;

  const [ownerRole, adminRole, memberRole] = await Promise.all([
    prisma.role.create({
      data: { guildId: guild.id, name: 'Owner', color: '#f59e0b', position: 100, permissions: GuildPermissions.ADMINISTRATOR },
    }),
    prisma.role.create({
      data: { guildId: guild.id, name: 'Admin', color: '#ef4444', position: 50,  permissions: adminPerms },
    }),
    prisma.role.create({
      data: { guildId: guild.id, name: 'Member', color: '#99aab5', position: 1,  permissions: memberPerms },
    }),
  ]);
  console.log(`✅ Roles: Owner, Admin, Member`);

  // ── 3. Tạo Channels ───────────────────────────────────────────
  const category = await prisma.channel.create({
    data: {
      guildId: guild.id,
      type: ChannelType.CATEGORY,
      name: 'General',
      position: 0,
    },
  });

  const [chGeneral, chRandom, chAnnounce] = await Promise.all([
    prisma.channel.create({
      data: { guildId: guild.id, parentId: category.id, type: ChannelType.TEXT, name: 'general',       topic: 'Nói chuyện thoải mái', position: 1 },
    }),
    prisma.channel.create({
      data: { guildId: guild.id, parentId: category.id, type: ChannelType.TEXT, name: 'random',        topic: 'Meme, off-topic', position: 2 },
    }),
    prisma.channel.create({
      data: { guildId: guild.id, parentId: category.id, type: ChannelType.TEXT, name: 'announcements', topic: 'Thông báo quan trọng', position: 0 },
    }),
  ]);
  console.log(`✅ Channels: #announcements, #general, #random`);

  // ── 4. Thêm Members ───────────────────────────────────────────
  await prisma.guildMember.createMany({
    data: USERS.map((u) => ({
      guildId:  guild.id,
      userId:   u.id,
      username: u.username,
      avatar:   u.avatar,
    })),
  });

  // Assign roles
  await prisma.guildMemberRole.createMany({
    data: [
      { guildId: guild.id, userId: USERS[0].id, roleId: ownerRole.id  }, // khang → Owner
      { guildId: guild.id, userId: USERS[1].id, roleId: adminRole.id  }, // alice → Admin
      { guildId: guild.id, userId: USERS[2].id, roleId: memberRole.id }, // bob   → Member
    ],
  });
  console.log(`✅ Members: khang (Owner), alice (Admin), bob (Member)`);

  // ── 5. Seed Messages ──────────────────────────────────────────
  const msg1 = await prisma.message.create({
    data: {
      channelId:   chAnnounce.id,
      senderId:    USERS[0].id,
      senderName:  USERS[0].username,
      senderAvatar: USERS[0].avatar,
      content:     'Server đã được tạo! Chào mừng mọi người 🎉',
      type:        'SYSTEM',
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      channelId:   chGeneral.id,
      senderId:    USERS[0].id,
      senderName:  USERS[0].username,
      senderAvatar: USERS[0].avatar,
      content:     'Hello everyone! Server đang trong quá trình build.',
    },
  });

  const msg3 = await prisma.message.create({
    data: {
      channelId:   chGeneral.id,
      senderId:    USERS[1].id,
      senderName:  USERS[1].username,
      senderAvatar: USERS[1].avatar,
      content:     'Chào khang! Trông có vẻ xịn đấy 👍',
      replyToId:   msg2.id,
    },
  });

  await prisma.message.create({
    data: {
      channelId:   chGeneral.id,
      senderId:    USERS[2].id,
      senderName:  USERS[2].username,
      senderAvatar: USERS[2].avatar,
      content:     'Có khi nào làm voice channel không?',
    },
  });

  await prisma.message.create({
    data: {
      channelId:   chRandom.id,
      senderId:    USERS[1].id,
      senderName:  USERS[1].username,
      senderAvatar: USERS[1].avatar,
      content:     'Ai có meme hay share đây 😂',
    },
  });
  console.log(`✅ Messages: 5 messages across 3 channels`);

  // ── 6. Seed Reactions ─────────────────────────────────────────
  await prisma.messageReaction.createMany({
    data: [
      { messageId: msg2.id, userId: USERS[1].id, emoji: '👍' },
      { messageId: msg2.id, userId: USERS[2].id, emoji: '👍' },
      { messageId: msg2.id, userId: USERS[2].id, emoji: '🎉' },
      { messageId: msg3.id, userId: USERS[0].id, emoji: '❤️'  },
    ],
  });
  console.log(`✅ Reactions: 4 reactions`);

  console.log('\n🎉 Done! Guild seed complete.');
  console.log(`   Guild ID : ${guild.id}`);
  console.log(`   Channels : #announcements, #general, #random`);
  console.log(`   Members  : khang, alice, bob`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
