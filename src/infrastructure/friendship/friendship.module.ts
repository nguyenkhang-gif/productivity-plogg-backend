import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Friendship,
  FriendshipSchema,
} from 'src/infrastructure/databases/schemas/friendship.schema';
import { MongoFriendshipRepository } from 'src/infrastructure/databases/repositories/friendship.repository';
import { FRIENDSHIP_REPOSITORY } from 'src/core/domain/repositories/friendship.repository.interface';
import { FriendshipController } from 'src/presentation/controllers/friendship.controller';
import { SendFriendRequestUseCase } from 'src/use-case/friendship/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from 'src/use-case/friendship/accept-friend-request.use-case';
import { RejectFriendRequestUseCase } from 'src/use-case/friendship/reject-friend-request.use-case';
import { BlockUserUseCase } from 'src/use-case/friendship/block-user.use-case';
import { UnfriendUseCase } from 'src/use-case/friendship/unfriend.use-case';
import { GetFriendsUseCase } from 'src/use-case/friendship/get-friends.use-case';
import { GetPendingRequestsUseCase } from 'src/use-case/friendship/get-pending-requests.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Friendship.name, schema: FriendshipSchema }]),
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
