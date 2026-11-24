import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/modules/community/channel/domain/channel.repository.interface';
import {
  ChannelCreated,
  ChannelDeleted,
  ChannelUpdated,
} from 'src/modules/community/channel/domain/events/channel.events';
import {
  MemberJoined,
  MemberKicked,
  MemberLeft,
  MemberRolesChanged,
} from 'src/modules/community/guild-member/domain/events/member.events';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  GuildPermissions,
  hasPermission,
} from 'src/modules/community/guild/domain/guild-permissions';
import {
  MessageCreated,
  MessageDeleted,
  MessageEdited,
  ReactionChanged,
} from 'src/modules/community/message/domain/events/message.events';
import { GuildRealtimeService } from 'src/modules/community/realtime/infrastructure/guild-realtime.service';
import {
  RoleDeleted,
  RoleUpdated,
} from 'src/modules/community/role/domain/events/role.events';

@Injectable()
export class GuildRealtimeListener {
  private readonly logger = new Logger(GuildRealtimeListener.name);

  constructor(
    private readonly realtime: GuildRealtimeService,
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  @OnEvent(MessageCreated.eventName)
  onMessageCreated(e: MessageCreated) {
    this.realtime
      .getServer()
      ?.to(`channel:${e.channelId}`)
      .emit('new_message', e.message);
  }

  @OnEvent(MessageEdited.eventName)
  onMessageEdited(e: MessageEdited) {
    this.realtime
      .getServer()
      ?.to(`channel:${e.channelId}`)
      .emit('message_edited', {
        messageId: e.messageId,
        content: e.content,
        editedAt: e.editedAt,
      });
  }

  @OnEvent(MessageDeleted.eventName)
  onMessageDeleted(e: MessageDeleted) {
    this.realtime
      .getServer()
      ?.to(`channel:${e.channelId}`)
      .emit('message_deleted', { messageId: e.messageId });
  }

  @OnEvent(ReactionChanged.eventName)
  onReactionChanged(e: ReactionChanged) {
    this.realtime
      .getServer()
      ?.to(`channel:${e.channelId}`)
      .emit('reaction_updated', {
        messageId: e.messageId,
        emoji: e.emoji,
        userId: e.userId,
      });
  }

  @OnEvent(MemberJoined.eventName)
  onMemberJoined(e: MemberJoined) {
    this.realtime.getServer()?.to(`guild:${e.guildId}`).emit('member_joined', {
      guildId: e.guildId,
      userId: e.userId,
      username: e.username,
      avatar: e.avatar,
    });
  }

  @OnEvent(MemberLeft.eventName)
  async onMemberLeft(e: MemberLeft) {
    const server = this.realtime.getServer();
    server
      ?.to(`guild:${e.guildId}`)
      .emit('member_left', { guildId: e.guildId, userId: e.userId });
    await this.evictFromGuild(e.userId, e.guildId);
  }

  @OnEvent(MemberKicked.eventName)
  async onMemberKicked(e: MemberKicked) {
    const server = this.realtime.getServer();
    server?.to(`guild:${e.guildId}`).emit('member_kicked', {
      guildId: e.guildId,
      userId: e.userId,
    });
    await this.evictFromGuild(e.userId, e.guildId);
  }

  @OnEvent(MemberRolesChanged.eventName)
  async onMemberRolesChanged(e: MemberRolesChanged) {
    this.realtime
      .getServer()
      ?.to(`guild:${e.guildId}`)
      .emit('member_roles_changed', {
        guildId: e.guildId,
        userId: e.userId,
        roleId: e.roleId,
        action: e.action,
      });
    await this.recheckChannelAccess(e.guildId, e.userId);
  }

  @OnEvent(RoleUpdated.eventName)
  async onRoleUpdated(e: RoleUpdated) {
    this.realtime
      .getServer()
      ?.to(`guild:${e.guildId}`)
      .emit('role_updated', {
        ...e.role,
        permissions: e.role.permissions.toString(),
      });
    await this.recheckChannelAccess(e.guildId);
  }

  @OnEvent(RoleDeleted.eventName)
  async onRoleDeleted(e: RoleDeleted) {
    this.realtime
      .getServer()
      ?.to(`guild:${e.guildId}`)
      .emit('role_deleted', { guildId: e.guildId, roleId: e.roleId });
    await this.recheckChannelAccess(e.guildId);
  }

  @OnEvent(ChannelCreated.eventName)
  onChannelCreated(e: ChannelCreated) {
    this.realtime
      .getServer()
      ?.to(`guild:${e.guildId}`)
      .emit('channel_created', e.channel);
  }

  @OnEvent(ChannelUpdated.eventName)
  async onChannelUpdated(e: ChannelUpdated) {
    this.realtime
      .getServer()
      ?.to(`guild:${e.guildId}`)
      .emit('channel_updated', e.channel);
    await this.recheckChannelAccess(e.guildId);
  }

  @OnEvent(ChannelDeleted.eventName)
  onChannelDeleted(e: ChannelDeleted) {
    const server = this.realtime.getServer();
    server
      ?.to(`guild:${e.guildId}`)
      .emit('channel_deleted', { guildId: e.guildId, channelId: e.channelId });
    server?.in(`channel:${e.channelId}`).socketsLeave(`channel:${e.channelId}`);
  }

  private async evictFromGuild(userId: string, guildId: string) {
    const server = this.realtime.getServer();
    if (!server) return;
    try {
      const channels = await this.channelRepo.findByGuild(guildId);
      const rooms = [
        `guild:${guildId}`,
        ...channels.map((c) => `channel:${c.id}`),
      ];
      server.in(`user:${userId}`).socketsLeave(rooms);
    } catch (err) {
      this.logger.warn(`evictFromGuild failed: ${(err as Error).message}`);
    }
  }

  private async recheckChannelAccess(guildId: string, onlyUserId?: string) {
    const server: Server | undefined = this.realtime.getServer();
    if (!server) return;
    try {
      const channels = await this.channelRepo.findByGuild(guildId);
      const verdicts = new Map<string, boolean>();
      for (const channel of channels) {
        const room = `channel:${channel.id}`;
        const sockets = await server.in(room).fetchSockets();
        for (const socket of sockets) {
          const userId: string | undefined = socket.data?.userId;
          if (!userId) continue;
          if (onlyUserId && userId !== onlyUserId) continue;
          let allowed = verdicts.get(userId);
          if (allowed === undefined) {
            const perms = await this.memberRepo.getResolvedPermissions(
              guildId,
              userId,
            );
            allowed = hasPermission(perms, GuildPermissions.VIEW_CHANNELS);
            verdicts.set(userId, allowed);
          }
          if (!allowed) socket.leave(room);
        }
      }
    } catch (err) {
      this.logger.warn(
        `recheckChannelAccess failed: ${(err as Error).message}`,
      );
    }
  }
}
