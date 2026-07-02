import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SendMessageUseCase } from 'src/use-case/chat/send-message.use-case';
import { GetMessagesUseCase } from 'src/use-case/chat/get-messages.use-case';
import { GetConversationsUseCase } from 'src/use-case/chat/get-conversations.use-case';
import { CreateConversationUseCase } from 'src/use-case/chat/create-conversation.use-case';

@WebSocketGateway({ namespace: 'chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId → Set<socketId> để hỗ trợ multi-tab
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly sendMessage: SendMessageUseCase,
    private readonly getMessages: GetMessagesUseCase,
    private readonly getConversations: GetConversationsUseCase,
    private readonly createConversation: CreateConversationUseCase,
  ) {}

  private extractUserId(client: Socket): string | null {
    const raw =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization ||
      client.handshake.headers?.auth;

    if (!raw) return null;

    const token = (raw as string).replace(/^Bearer\s+/i, '');

    try {
      const payload = this.jwtService.verify(token);
      return payload.sub as string;
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
      return;
    }

    client.data.userId = userId;

    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(client.id);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string;
    if (!userId) return;

    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.connectedUsers.delete(userId);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(data.conversationId);
    const messages = await this.getMessages.execute(data.conversationId, 30);
    client.emit('history', messages);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: string; content: string; type?: 'text' | 'image' },
  ) {
    const senderId = client.data.userId as string;
    if (!senderId) throw new WsException('Unauthorized');

    const message = await this.sendMessage.execute({
      conversationId: data.conversationId,
      senderId,
      content: data.content,
      type: data.type,
    });

    this.server.to(data.conversationId).emit('new_message', message);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId as string;
    client.to(data.conversationId).emit('user_typing', { userId });
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string;
    const conversations = await this.getConversations.execute(userId);
    client.emit('conversations', conversations);
  }

  @SubscribeMessage('create_conversation')
  async handleCreateConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    const userId = client.data.userId as string;
    const conversation = await this.createConversation.execute([
      userId,
      data.targetUserId,
    ]);
    client.emit('conversation_created', conversation);
  }
}
