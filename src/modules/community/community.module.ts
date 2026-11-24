import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/identity';

import { GUILD_REPOSITORY } from 'src/modules/community/guild/domain/guild.repository.interface';
import { CHANNEL_REPOSITORY } from 'src/modules/community/channel/domain/channel.repository.interface';
import { GUILD_MEMBER_REPOSITORY } from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import { MESSAGE_REPOSITORY } from 'src/modules/community/message/domain/message.repository.interface';

import { GuildPrismaRepository } from 'src/modules/community/guild/infrastructure/guild.prisma.repository';
import { ChannelPrismaRepository } from 'src/modules/community/channel/infrastructure/channel.prisma.repository';
import { GuildMemberPrismaRepository } from 'src/modules/community/guild-member/infrastructure/guild-member.prisma.repository';
import { MessagePrismaRepository } from 'src/modules/community/message/infrastructure/message.prisma.repository';

import { GUILD_REALTIME } from './realtime/domain/guild-realtime.interface';
import { GuildRealtimeService } from './realtime/infrastructure/guild-realtime.service';
import { DeleteInviteUseCase } from 'src/modules/community/invite/application/delete-invite.use-case';
import { GuildGateway } from 'src/modules/community/realtime/presentation/guild.gateway';
import { CreateGuildUseCase } from 'src/modules/community/guild/application/create-guild.use-case';
import { GetGuildUseCase } from 'src/modules/community/guild/application/get-guild.use-case';
import { UpdateGuildUseCase } from 'src/modules/community/guild/application/update-guild.use-case';
import { DeleteGuildUseCase } from 'src/modules/community/guild/application/delete-guild.use-case';
import { GetMyGuildsUseCase } from 'src/modules/community/guild/application/get-my-guilds.use-case';
import { CreateChannelUseCase } from 'src/modules/community/channel/application/create-channel.use-case';
import { GetChannelsUseCase } from 'src/modules/community/channel/application/get-channels.use-case';
import { UpdateChannelUseCase } from 'src/modules/community/channel/application/update-channel.use-case';
import { DeleteChannelUseCase } from 'src/modules/community/channel/application/delete-channel.use-case';
import { ReorderChannelsUseCase } from 'src/modules/community/channel/application/reorder-channels.use-case';
import { LeaveGuildUseCase } from 'src/modules/community/guild-member/application/leave-guild.use-case';
import { KickMemberUseCase } from 'src/modules/community/guild-member/application/kick-member.use-case';
import { AssignRoleUseCase } from 'src/modules/community/guild-member/application/assign-role.use-case';
import { RemoveRoleUseCase } from 'src/modules/community/guild-member/application/remove-role.use-case';
import { GetMessagesUseCase } from 'src/modules/community/message/application/get-messages.use-case';
import { SendMessageUseCase } from 'src/modules/community/message/application/send-message.use-case';
import { EditMessageUseCase } from 'src/modules/community/message/application/edit-message.use-case';
import { DeleteMessageUseCase } from 'src/modules/community/message/application/delete-message.use-case';
import { AddReactionUseCase } from 'src/modules/community/message/application/add-reaction.use-case';
import { PrismaModule } from '../../shared/database/prisma.module';
import { ROLE_REPOSITORY } from 'src/modules/community/role/domain/role.repository.interface';
import { RolePrismaRepository } from './role/infrastructure/role.prisma.repository';
import { GuildController } from 'src/modules/community/guild/presentation/guild.controller';
import { ChannelController } from 'src/modules/community/channel/presentation/channel.controller';
import { GuildMemberController } from 'src/modules/community/guild-member/presentation/guild-member.controller';
import { RoleController } from 'src/modules/community/role/presentation/role.controller';
import { MessageController } from 'src/modules/community/message/presentation/message.controller';
import { GetMembersUseCase } from 'src/modules/community/guild-member/application/get-members.use-case';
import { GUILD_INVITE_REPOSITORY } from 'src/modules/community/invite/domain/guild-invite.repository.interface';
import { GuildInvitePrismaRepository } from './invite/infrastructure/guild-invite.prisma.repository';
import { InviteController } from 'src/modules/community/invite/presentation/invite.controller';
import { PublicInviteController } from 'src/modules/community/invite/presentation/public-invite.controller';
import { CreateInviteUseCase } from 'src/modules/community/invite/application/create-invite.use-case';
import { GetInvitePreviewUseCase } from 'src/modules/community/invite/application/get-invite-preview.use-case';
import { JoinViaInviteUseCase } from 'src/modules/community/invite/application/join-via-invite.use-case';
import { CreateRoleUseCase } from 'src/modules/community/role/application/create-role.use-case';
import { GetRolesUseCase } from 'src/modules/community/role/application/get-roles.use-case';
import { UpdateRoleUseCase } from 'src/modules/community/role/application/update-role.use-case';
import { DeleteRoleUseCase } from 'src/modules/community/role/application/delete-role.use-case';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    GuildController,
    ChannelController,
    GuildMemberController,
    RoleController,
    MessageController,
    InviteController,
    PublicInviteController,
  ],
  providers: [
    { provide: GUILD_REPOSITORY, useClass: GuildPrismaRepository },
    { provide: CHANNEL_REPOSITORY, useClass: ChannelPrismaRepository },
    { provide: GUILD_MEMBER_REPOSITORY, useClass: GuildMemberPrismaRepository },
    { provide: MESSAGE_REPOSITORY, useClass: MessagePrismaRepository },
    { provide: ROLE_REPOSITORY, useClass: RolePrismaRepository },
    { provide: GUILD_INVITE_REPOSITORY, useClass: GuildInvitePrismaRepository },
    GuildRealtimeService,
    { provide: GUILD_REALTIME, useExisting: GuildRealtimeService },
    GuildGateway,
    CreateGuildUseCase,
    GetMyGuildsUseCase,
    GetGuildUseCase,
    UpdateGuildUseCase,
    DeleteGuildUseCase,
    CreateChannelUseCase,
    GetChannelsUseCase,
    UpdateChannelUseCase,
    DeleteChannelUseCase,
    ReorderChannelsUseCase,
    LeaveGuildUseCase,
    KickMemberUseCase,
    AssignRoleUseCase,
    RemoveRoleUseCase,
    GetMembersUseCase,
    CreateInviteUseCase,
    GetInvitePreviewUseCase,
    JoinViaInviteUseCase,
    DeleteInviteUseCase,
    GetMessagesUseCase,
    SendMessageUseCase,
    EditMessageUseCase,
    DeleteMessageUseCase,
    AddReactionUseCase,
    CreateRoleUseCase,
    GetRolesUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
  ],
})
export class GuildModule {}
