import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetMessagesUseCase } from 'src/use-case/message/get-messages.use-case';

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
      limit ? Number(limit) : undefined,
    );
  }
}
