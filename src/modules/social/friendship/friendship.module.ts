import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Friendship,
  FriendshipSchema,
} from 'src/modules/social/friendship/infrastructure/friendship.schema';
import { MongoFriendshipRepository } from 'src/modules/social/friendship/infrastructure/friendship.repository';
import { FRIENDSHIP_REPOSITORY } from 'src/modules/social/friendship/domain/friendship.repository.interface';
import { FriendshipController } from 'src/modules/social/friendship/presentation/friendship.controller';
import { SendFriendRequestUseCase } from 'src/modules/social/friendship/application/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from 'src/modules/social/friendship/application/accept-friend-request.use-case';
import { RejectFriendRequestUseCase } from 'src/modules/social/friendship/application/reject-friend-request.use-case';
import { BlockUserUseCase } from 'src/modules/social/friendship/application/block-user.use-case';
import { UnfriendUseCase } from 'src/modules/social/friendship/application/unfriend.use-case';
import { GetFriendsUseCase } from 'src/modules/social/friendship/application/get-friends.use-case';
import { GetPendingRequestsUseCase } from 'src/modules/social/friendship/application/get-pending-requests.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
  ],
  controllers: [FriendshipController],
  providers: [
    { provide: FRIENDSHIP_REPOSITORY, useClass: MongoFriendshipRepository },
    SendFriendRequestUseCase,
    AcceptFriendRequestUseCase,
    RejectFriendRequestUseCase,
    BlockUserUseCase,
    UnfriendUseCase,
    GetFriendsUseCase,
    GetPendingRequestsUseCase,
  ],
})
export class FriendshipModule {}
