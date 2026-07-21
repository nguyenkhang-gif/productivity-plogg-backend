import { Module } from '@nestjs/common';
import { AuthModule } from 'src/infrastructure/auth/auth.module';

import { GUILD_REPOSITORY } from 'src/core/domain/repositories/guild.repository.interface';
import { CHANNEL_REPOSITORY } from 'src/core/domain/repositories/channel.repository.interface';
import { GUILD_MEMBER_REPOSITORY } from 'src/core/domain/repositories/guild-member.repository.interface';
import { MESSAGE_REPOSITORY } from 'src/core/domain/repositories/message.repository.interface';

import { GuildPrismaRepository } from 'src/infrastructure/databases/repositories/guild.prisma.repository';
import { ChannelPrismaRepository } from 'src/infrastructure/databases/repositories/channel.prisma.repository';
import { GuildMemberPrismaRepository } from 'src/infrastructure/databases/repositories/guild-member.prisma.repository';
import { MessagePrismaRepository } from 'src/infrastructure/databases/repositories/message.prisma.repository';

import { GuildGateway } from 'src/presentation/gateways/guild.gateway';
import { CreateGuildUseCase } from 'src/use-case/guild/create-guild.use-case';
import { GetGuildUseCase } from 'src/use-case/guild/get-guild.use-case';
import { UpdateGuildUseCase } from 'src/use-case/guild/update-guild.use-case';
import { DeleteGuildUseCase } from 'src/use-case/guild/delete-guild.use-case';
import { GetMyGuildsUseCase } from 'src/use-case/guild/get-my-guilds.use-case';
import { CreateChannelUseCase } from 'src/use-case/channel/create-channel.use-case';
import { GetChannelsUseCase } from 'src/use-case/channel/get-channels.use-case';
import { DeleteChannelUseCase } from 'src/use-case/channel/delete-channel.use-case';
import { LeaveGuildUseCase } from 'src/use-case/guild-member/leave-guild.use-case';
import { JoinGuildUseCase } from 'src/use-case/guild-member/join-guild.use-case';
import { KickMemberUseCase } from 'src/use-case/guild-member/kick-member.use-case';
import { AssignRoleUseCase } from 'src/use-case/guild-member/assign-role.use-case';
import { GetMessagesUseCase } from 'src/use-case/message/get-messages.use-case';
import { SendMessageUseCase } from 'src/use-case/message/send-message.use-case';
import { EditMessageUseCase } from 'src/use-case/message/edit-message.use-case';
import { DeleteMessageUseCase } from 'src/use-case/message/delete-message.use-case';
import { AddReactionUseCase } from 'src/use-case/message/add-reaction.use-case';
import { PrismaModule } from '../databases/prisma/prisma.module';
import { ROLE_REPOSITORY } from 'src/core/domain/repositories/role.repository.interface';
import { RolePrismaRepository } from '../databases/repositories/role.prisma.repository';
import { GuildController } from 'src/presentation/controllers/guild.controller';
import { ChannelController } from 'src/presentation/controllers/channel.controller';
import { GuildMemberController } from 'src/presentation/controllers/guild-member.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [GuildController, ChannelController, GuildMemberController],
  providers: [
    { provide: GUILD_REPOSITORY, useClass: GuildPrismaRepository },
    { provide: CHANNEL_REPOSITORY, useClass: ChannelPrismaRepository },
    { provide: GUILD_MEMBER_REPOSITORY, useClass: GuildMemberPrismaRepository },
    { provide: MESSAGE_REPOSITORY, useClass: MessagePrismaRepository },
    { provide: ROLE_REPOSITORY, useClass: RolePrismaRepository },
    GuildGateway,
    CreateGuildUseCase,
    GetMyGuildsUseCase,
    GetGuildUseCase,
    UpdateGuildUseCase,
    DeleteGuildUseCase,
    CreateChannelUseCase,
    GetChannelsUseCase,
    DeleteChannelUseCase,
    JoinGuildUseCase,
    LeaveGuildUseCase,
    KickMemberUseCase,
    AssignRoleUseCase,
    GetMessagesUseCase,
    SendMessageUseCase,
    EditMessageUseCase,
    DeleteMessageUseCase,
    AddReactionUseCase,
  ],
})
export class GuildModule {}
