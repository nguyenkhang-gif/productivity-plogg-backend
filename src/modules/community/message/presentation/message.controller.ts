import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { clampLimit } from 'src/modules/community/shared/pagination';
import { GetMessagesUseCase } from 'src/modules/community/message/application/get-messages.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/channels/:channelId/messages')
export class MessageController {
  constructor(private readonly getMessages: GetMessagesUseCase) {}

  @Get()
  list(
    @Param('channelId') channelId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req,
  ) {
    return this.getMessages.execute(
      channelId,
      req.user.userId,
      cursor,
      clampLimit(limit, 30),
    );
  }
}
