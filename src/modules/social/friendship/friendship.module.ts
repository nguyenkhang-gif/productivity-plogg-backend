import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Friendship,
  FriendshipSchema,
} from 'src/modules/social/friendship/infrastructure/friendship.schema';
import { MongoFriendshipRepository } from 'src/modules/social/friendship/infrastructure/friendship.repository';
import { PrismaFriendshipRepository } from 'src/modules/social/friendship/infrastructure/friendship.prisma.repository';
import { backendProvider } from 'src/shared/database/backend-provider';
import { PrismaModule } from 'src/shared/database/prisma.module';
import type { FriendshipRepository } from 'src/modules/social/friendship/domain/friendship.repository.interface';
import { FRIENDSHIP_REPOSITORY } from 'src/modules/social/friendship/domain/friendship.repository.interface';
import { FriendshipController } from 'src/modules/social/friendship/presentation/friendship.controller';
import { SendFriendRequestUseCase } from 'src/modules/social/friendship/application/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from 'src/modules/social/friendship/application/accept-friend-request.use-case';
import { RejectFriendRequestUseCase } from 'src/modules/social/friendship/application/reject-friend-request.use-case';
import { BlockUserUseCase } from 'src/modules/social/friendship/application/block-user.use-case';
import { UnfriendUseCase } from 'src/modules/social/friendship/application/unfriend.use-case';
import { GetFriendsUseCase } from 'src/modules/social/friendship/application/get-friends.use-case';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';
import { GetPendingRequestsUseCase } from 'src/modules/social/friendship/application/get-pending-requests.use-case';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
  ],
  controllers: [FriendshipController],
  providers: [
    MongoFriendshipRepository,
    PrismaFriendshipRepository,
    backendProvider<FriendshipRepository>(
      FRIENDSHIP_REPOSITORY,
      MongoFriendshipRepository,
      PrismaFriendshipRepository,
    ),
    SendFriendRequestUseCase,
    AcceptFriendRequestUseCase,
    RejectFriendRequestUseCase,
    BlockUserUseCase,
    UnfriendUseCase,
    GetFriendsUseCase,
    GetPendingRequestsUseCase,
    RelationshipService,
  ],
  exports: [RelationshipService, FRIENDSHIP_REPOSITORY],
})
export class FriendshipModule {}
