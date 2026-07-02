import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Message, MessageSchema } from '../databases/schemas/message.schema';
import {
  Conversation,
  ConversationSchema,
} from '../databases/schemas/conversation.schema';
import { MongoMessageRepository } from '../databases/repositories/message.repository';
import { MongoConversationRepository } from '../databases/repositories/conversation.repository';
import { MESSAGE_REPOSITORY } from 'src/core/domain/repositories/message.repository.interface';
import { CONVERSATION_REPOSITORY } from 'src/core/domain/repositories/conversation.repository.interface';
import { SendMessageUseCase } from 'src/use-case/chat/send-message.use-case';
import { GetMessagesUseCase } from 'src/use-case/chat/get-messages.use-case';
import { GetConversationsUseCase } from 'src/use-case/chat/get-conversations.use-case';
import { CreateConversationUseCase } from 'src/use-case/chat/create-conversation.use-case';
import { ChatGateway } from 'src/presentation/gateways/chat.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET_KEY')?.trim() ||
          'defaultSecret',
      }),
    }),
  ],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: MongoMessageRepository },
    { provide: CONVERSATION_REPOSITORY, useClass: MongoConversationRepository },
    SendMessageUseCase,
    GetMessagesUseCase,
    GetConversationsUseCase,
    CreateConversationUseCase,
    ChatGateway,
  ],
})
export class ChatModule {}
