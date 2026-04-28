import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeminiModule } from './gemini/gemini.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { EpubModule } from './infrastructure/epub/epub.module';
import { DriveModule } from './google/drive.module';
import { BudgetModule } from './budget/budget.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { AppConfigModule } from './infrastructure/config/config.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { PostModule } from './infrastructure/post/post.module';
import { FriendshipModule } from './infrastructure/friendship/friendship.module';
import { CommentModule } from './infrastructure/comment/comment.module';
import { ChatModule } from './infrastructure/chat/chat.module';
import { StorageModule } from './infrastructure/storage/storage.module';
@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_DB_URI'),
      }),
    }),
    GeminiModule,
    MailModule,
    EpubModule,
    DriveModule,
    BudgetModule,
    TranscriptionModule,
    AuthModule,
    PostModule,
    FriendshipModule,
    CommentModule,
    ChatModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
