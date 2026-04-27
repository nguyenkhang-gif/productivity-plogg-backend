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
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { FriendTargetDto } from 'src/core/dtos/friendship.dto';
import { SendFriendRequestUseCase } from 'src/use-case/friendship/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from 'src/use-case/friendship/accept-friend-request.use-case';
import { RejectFriendRequestUseCase } from 'src/use-case/friendship/reject-friend-request.use-case';
import { BlockUserUseCase } from 'src/use-case/friendship/block-user.use-case';
import { UnfriendUseCase } from 'src/use-case/friendship/unfriend.use-case';
import { GetFriendsUseCase } from 'src/use-case/friendship/get-friends.use-case';
import { GetPendingRequestsUseCase } from 'src/use-case/friendship/get-pending-requests.use-case';

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
