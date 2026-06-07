import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LastSeenMiddleware } from './presentation/middleware/last-seen.middleware';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from './infrastructure/mail/mail.module';
import { EpubModule } from './infrastructure/epub/epub.module';
import { DriveModule } from './google/drive.module';
import { BudgetModule } from './budget/budget.module';
import { AppConfigModule } from './infrastructure/config/config.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { PostModule } from './infrastructure/post/post.module';
import { FriendshipModule } from './infrastructure/friendship/friendship.module';
import { CommentModule } from './infrastructure/comment/comment.module';
import { ChatModule } from './infrastructure/chat/chat.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { ReactionModule } from './infrastructure/reaction/reaction.module';
import { AiModule } from './infrastructure/ai/ai.module';
import { TranslationContextModule } from './infrastructure/translation-context/translation-context.module';
import { StoryContextModule } from './infrastructure/story-context/story-context.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { TagModule } from './infrastructure/tag/tag.module';
import { CategoryModule } from './infrastructure/category/category.module';
import { BookmarkModule } from './infrastructure/bookmark/bookmark.module';
import { User, UserSchema } from './infrastructure/databases/schemas/user.schema';

@Module({
  imports: [
    AppConfigModule,
    CacheModule,
    TagModule,
    CategoryModule,
    BookmarkModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_DB_URI'),
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MailModule,
    EpubModule,
    DriveModule,
    BudgetModule,
    AuthModule,
    PostModule,
    FriendshipModule,
    CommentModule,
    ChatModule,
    StorageModule,
    ReactionModule,
    AiModule,
    TranslationContextModule,
    StoryContextModule,
  ],
  controllers: [AppController],
  providers: [AppService, LastSeenMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LastSeenMiddleware).forRoutes({ path: 'api/*path', method: RequestMethod.ALL });
  }
}
