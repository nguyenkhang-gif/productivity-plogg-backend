import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';
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
@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_DB_URI),
    UserModule,
    AuthModule,
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
    TranscriptionModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
