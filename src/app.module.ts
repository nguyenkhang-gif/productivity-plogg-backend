import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { GeminiModule } from './gemini/gemini.module';
import { MailModule } from './mail/mail.module';
import { EpubModule } from './epub/epub.module';
import { TokenModule } from './token/token.module';
import { SupabaseModule } from './supabase/supabase.module';
import { DriveModule } from './google/drive.module';
import { ConversationModule } from './conversation/conversation.module';
import { BudgetModule } from './budget/budget.module';
import { OllamaModule } from './ollama/ollama.module';
import { PostModule } from './post/post.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { AppConfigModule } from './infrastructure/config/config.module';
import { AuthModule } from './infrastructure/auth/auth.module';
@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_DB_URI'),
      }),
    }),
    FirebaseModule,
    GeminiModule,
    MailModule,
    EpubModule,
    TokenModule,
    SupabaseModule,
    DriveModule,
    ConversationModule,
    BudgetModule,
    PostModule,
    OllamaModule,
    TranscriptionModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
