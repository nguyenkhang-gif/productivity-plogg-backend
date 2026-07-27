import { Inject, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message } from 'src/core/domain/entities/message.entity';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/core/domain/repositories/channel.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import { TokenService } from 'src/infrastructure/auth/token/token.service';
import { AddReactionUseCase } from 'src/use-case/message/add-reaction.use-case';
import { DeleteMessageUseCase } from 'src/use-case/message/delete-message.use-case';
import { EditMessageUseCase } from 'src/use-case/message/edit-message.use-case';
import { GetMessagesUseCase } from 'src/use-case/message/get-messages.use-case';
import { SendMessageUseCase } from 'src/use-case/message/send-message.use-case';
import { WsHttpExceptionFilter } from './ws-exception.filter';

@UseFilters(new WsHttpExceptionFilter())
@WebSocketGateway({ namespace: '/guild', cors: { origin: '*' } })
export class GuildGateway
  implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,

    private readonly getMessageUseCase: GetMessagesUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly editMessageUseCase: EditMessageUseCase,
    private readonly delelteMessageUseCase: DeleteMessageUseCase,
    private readonly addReactionUseCase: AddReactionUseCase,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(CHANNEL_REPOSITORY)
    private readonly channelRepo: ChannelRepository,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) return next(new Error('Unauthorizez'));
        const payload = await this.jwtService.verifyAsync(token);

        if (
          payload.jti &&
          (await this.tokenService.isBlacklisted(payload.jti))
        ) {
          throw new Error('Token revoked');
        }

        socket.data.userId = payload.sub;
        socket.data.username = payload.email;

        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(_client: Socket) {
    // Auth đã xử lý ở afterInit middleware — client.data đã có sẵn khi tới đây.
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('join_guild')
  async handleJoinGuild(
    @MessageBody() payload: { guildId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ status: string; guildId: string }> {
    const isMember = await this.memberRepo.isMember(
      payload.guildId,
      client.data.userId,
    );
    if (!isMember) throw new WsException('not a member');

    client.join(`guild:${payload.guildId}`);
    return { status: 'joined', guildId: payload.guildId };
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @MessageBody() payload: { channelId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ status: string; data: { messages: Message[] } }> {
    const channel = await this.channelRepo.findById(payload.channelId);
    if (!channel) throw new WsException('channel not found');

    const isMember = await this.memberRepo.isMember(
      channel.guildId,
      client.data.userId,
    );
    if (!isMember) throw new WsException('not a member');

    client.join(`channel:${payload.channelId}`);

    const messages = await this.getMessageUseCase.execute(
      payload.channelId,
      client.data.userId,
    );

    return { status: 'channel_ready', data: { messages } };
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    @MessageBody() payload: { channelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`channel:${payload.channelId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    payload: { channelId: string; content: string; replyToId?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const message = await this.sendMessageUseCase.execute({
      channelId: payload.channelId,
      senderId: client.data.userId,
      senderName: client.data.username,
      content: payload.content,
      replyToId: payload.replyToId,
    });

    this.server.to(`channel:${payload.channelId}`).emit('new_message', message);
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @MessageBody()
    payload: { messageId: string; channelId: string; content: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { messageId, channelId, content } = payload;
    const message = await this.editMessageUseCase.execute(
      messageId,
      client.data.userId,
      content,
    );

    this.server.to(`channel:${channelId}`).emit('message_edited', {
      messageId: messageId,
      content: message.content,
      editedAt: message.editedAt,
    });
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody()
    payload: { messageId: string; channelId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { messageId, channelId } = payload;
    await this.delelteMessageUseCase.execute(
      messageId,
      channelId,
      client.data.userId,
    );

    this.server.to(`channel:${channelId}`).emit('message_deleted', {
      messageId: messageId,
    });
  }

  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @MessageBody()
    payload: { messageId: string; channelId: string; emoji: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { messageId, channelId, emoji } = payload;

    await this.addReactionUseCase.execute(
      messageId,
      channelId,
      client.data.userId,
      emoji,
    );

    this.server.to(`channel:${payload.channelId}`).emit('reaction_updated', {
      messageId: payload.messageId,
      emoji: payload.emoji,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() payload: { channelId: string; action: 'start' | 'stop' },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`channel:${payload.channelId}`).emit('typing_update', {
      userId: client.data.userId,
      username: client.data.username,
      action: payload.action,
    });
  }
}
