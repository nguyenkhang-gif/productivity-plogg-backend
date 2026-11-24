import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpThrottlerGuard } from './shared/security/http-throttler.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  LastSeenMiddleware,
  AuthModule,
  User,
  UserSchema,
} from 'src/modules/identity';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  MailModule,
  EpubModule,
  DriveModule,
  AiModule,
  TranslationContextModule,
  StoryContextModule,
} from 'src/modules/labs';
import { AppConfigModule } from './shared/config/config.module';
import {
  PostModule,
  FriendshipModule,
  CommentModule,
  ReactionModule,
  TagModule,
  CategoryModule,
  BookmarkModule,
} from 'src/modules/social';
import { FocusModule, VaultModule } from 'src/modules/productivity';
import { StorageModule } from 'src/modules/media';
import { CacheModule } from './shared/cache/cache.module';
import { GuildModule } from 'src/modules/community';
import { PrismaModule } from './shared/database/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    CacheModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
    AuthModule,
    PostModule,
    FriendshipModule,
    FocusModule,
    VaultModule,
    CommentModule,
    StorageModule,
    ReactionModule,
    AiModule,
    TranslationContextModule,
    StoryContextModule,
    GuildModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LastSeenMiddleware,
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LastSeenMiddleware)
      .forRoutes({ path: 'api/*path', method: RequestMethod.ALL });
  }
}
