import {
  Inject,
  UseFilters,
  UsePipes,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
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
import {
  GuildPermissions,
  hasPermission,
} from 'src/modules/community/guild/domain/guild-permissions';
import { safeDisplayName } from 'src/modules/community/message/domain/display-name';
import { Message } from 'src/modules/community/message/domain/message.entity';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/modules/community/channel/domain/channel.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  AddReactionPayloadDto,
  ChannelIdPayloadDto,
  DeleteMessagePayloadDto,
  EditMessagePayloadDto,
  GuildIdPayloadDto,
  SendMessagePayloadDto,
  TypingPayloadDto,
} from 'src/modules/community/realtime/application/dto/guild-gateway.dto';
import { TokenService } from 'src/modules/identity';
import { GuildRealtimeService } from 'src/modules/community/realtime/infrastructure/guild-realtime.service';
import { SlidingWindowLimiter } from 'src/modules/community/realtime/infrastructure/rate-limiter';
import { AddReactionUseCase } from 'src/modules/community/message/application/add-reaction.use-case';
import { DeleteMessageUseCase } from 'src/modules/community/message/application/delete-message.use-case';
import { EditMessageUseCase } from 'src/modules/community/message/application/edit-message.use-case';
import { GetMessagesUseCase } from 'src/modules/community/message/application/get-messages.use-case';
import { SendMessageUseCase } from 'src/modules/community/message/application/send-message.use-case';
import { WsHttpExceptionFilter } from 'src/shared/realtime/ws-exception.filter';

@UseFilters(new WsHttpExceptionFilter())
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new WsException(
        errors.flatMap((e) => Object.values(e.constraints ?? {})),
      ),
  }),
)
@WebSocketGateway({ namespace: '/guild', cors: { origin: '*' } })
export class GuildGateway
  implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly messageLimiter = new SlidingWindowLimiter(10, 5000);
  private readonly typingLimiter = new SlidingWindowLimiter(1, 1000);
  private readonly reactionLimiter = new SlidingWindowLimiter(10, 5000);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly realtime: GuildRealtimeService,

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
    this.realtime.setServer(server);

    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) return next(new Error('Unauthorized'));
        const payload = await this.jwtService.verifyAsync(token);

        if (
          payload.jti &&
          (await this.tokenService.isBlacklisted(payload.jti))
        ) {
          // return (không throw) để message "Token revoked" tới được FE;
          // nếu throw sẽ bị catch nuốt và biến thành "Unauthorized".
          return next(new Error('Token revoked'));
        }

        socket.data.userId = payload.sub;
        socket.data.username = safeDisplayName(
          payload.username ?? payload.name,
          payload.sub,
        );

        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    client.join(`user:${client.data.userId}`);
  }

  handleDisconnect(client: Socket) {
    this.messageLimiter.clear(client.id);
    this.typingLimiter.clear(client.id);
    this.reactionLimiter.clear(client.id);
  }

  private throttled(
    limiter: SlidingWindowLimiter,
    client: Socket,
    event: string,
  ): boolean {
    if (limiter.allow(`${client.id}:${event}`)) return false;
    client.emit('error', { event, message: 'Rate limit exceeded' });
    return true;
  }

  @SubscribeMessage('join_guild')
  async handleJoinGuild(
    @MessageBody() payload: GuildIdPayloadDto,
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
    @MessageBody() payload: ChannelIdPayloadDto,
    @ConnectedSocket() client: Socket,
  ): Promise<{ status: string; data: { messages: Message[] } }> {
    const channel = await this.channelRepo.findById(payload.channelId);
    if (!channel) throw new WsException('channel not found');

    const isMember = await this.memberRepo.isMember(
      channel.guildId,
      client.data.userId,
    );
    if (!isMember) throw new WsException('not a member');

    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      client.data.userId,
    );
    if (!hasPermission(perms, GuildPermissions.VIEW_CHANNELS))
      throw new WsException('forbidden');

    const messages = await this.getMessageUseCase.execute(
      payload.channelId,
      client.data.userId,
    );

    client.join(`channel:${payload.channelId}`);

    return { status: 'channel_ready', data: { messages } };
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    @MessageBody() payload: ChannelIdPayloadDto,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`channel:${payload.channelId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: SendMessagePayloadDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (this.throttled(this.messageLimiter, client, 'send_message')) return;

    await this.sendMessageUseCase.execute({
      channelId: payload.channelId,
      senderId: client.data.userId,
      senderName: client.data.username,
      content: payload.content,
      replyToId: payload.replyToId,
    });
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @MessageBody() payload: EditMessagePayloadDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { messageId, channelId, content } = payload;
    await this.editMessageUseCase.execute(
      messageId,
      channelId,
      client.data.userId,
      content,
    );
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() payload: DeleteMessagePayloadDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { messageId, channelId } = payload;
    await this.delelteMessageUseCase.execute(
      messageId,
      channelId,
      client.data.userId,
    );
  }

  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @MessageBody() payload: AddReactionPayloadDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (this.throttled(this.reactionLimiter, client, 'add_reaction')) return;

    const { messageId, channelId, emoji } = payload;

    await this.addReactionUseCase.execute(
      messageId,
      channelId,
      client.data.userId,
      emoji,
    );
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() payload: TypingPayloadDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (this.throttled(this.typingLimiter, client, 'typing')) return;

    const channel = await this.channelRepo.findById(payload.channelId);
    if (!channel) throw new WsException('channel not found');

    const member = await this.memberRepo.findMember(
      channel.guildId,
      client.data.userId,
    );
    if (!member) throw new WsException('not a member');

    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      client.data.userId,
    );
    if (!hasPermission(perms, GuildPermissions.VIEW_CHANNELS))
      throw new WsException('forbidden');

    client.to(`channel:${channel.id}`).emit('typing_update', {
      userId: client.data.userId,
      username: safeDisplayName(member.username, client.data.username),
      action: payload.action,
    });
  }
}
