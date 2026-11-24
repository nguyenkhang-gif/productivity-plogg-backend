import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { FriendTargetDto } from 'src/modules/social/friendship/application/dto/friendship.dto';
import { SendFriendRequestUseCase } from 'src/modules/social/friendship/application/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from 'src/modules/social/friendship/application/accept-friend-request.use-case';
import { RejectFriendRequestUseCase } from 'src/modules/social/friendship/application/reject-friend-request.use-case';
import { BlockUserUseCase } from 'src/modules/social/friendship/application/block-user.use-case';
import { UnfriendUseCase } from 'src/modules/social/friendship/application/unfriend.use-case';
import { GetFriendsUseCase } from 'src/modules/social/friendship/application/get-friends.use-case';
import { GetPendingRequestsUseCase } from 'src/modules/social/friendship/application/get-pending-requests.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/friendships')
export class FriendshipController {
  constructor(
    private readonly sendRequest: SendFriendRequestUseCase,
    private readonly acceptRequest: AcceptFriendRequestUseCase,
    private readonly rejectRequest: RejectFriendRequestUseCase,
    private readonly blockUser: BlockUserUseCase,
    private readonly unfriend: UnfriendUseCase,
    private readonly getFriends: GetFriendsUseCase,
    private readonly getPendingRequests: GetPendingRequestsUseCase,
  ) {}

  @Get()
  friends(@Req() req) {
    return this.getFriends.execute(req.user.userId);
  }

  @Get('requests/received')
  pendingReceived(@Req() req) {
    return this.getPendingRequests.executeReceived(req.user.userId);
  }

  @Get('requests/sent')
  pendingSent(@Req() req) {
    return this.getPendingRequests.executeSent(req.user.userId);
  }

  @Post('request')
  sendFriendRequest(@Body() body: FriendTargetDto, @Req() req) {
    return this.sendRequest.execute(req.user.userId, body.friendId);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Req() req) {
    return this.acceptRequest.execute(id, req.user.userId);
  }

  @Delete(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(@Param('id') id: string, @Req() req) {
    return this.rejectRequest.execute(id, req.user.userId);
  }

  @Post('block')
  block(@Body() body: FriendTargetDto, @Req() req) {
    return this.blockUser.execute(req.user.userId, body.friendId);
  }

  @Delete(':friendId/unfriend')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfriendUser(@Param('friendId') friendId: string, @Req() req) {
    return this.unfriend.execute(req.user.userId, friendId);
  }
}
