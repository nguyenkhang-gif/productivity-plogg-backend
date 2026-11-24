import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateInviteUseCase } from 'src/use-case/invite/create-invite.use-case';
import { DeleteInviteUseCase } from 'src/use-case/invite/delete-invite.use-case';
import { CreateInviteDto } from 'src/core/dtos/create-invite.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/guilds/:guildId/invites')
export class InviteController {
  constructor(
    private readonly createInvite: CreateInviteUseCase,
    private readonly deleteInvite: DeleteInviteUseCase,
  ) {}

  @Post()
  create(
    @Param('guildId') guildId: string,
    @Body() body: CreateInviteDto,
    @Req() req,
  ) {
    return this.createInvite.execute(guildId, req.user.userId, {
      maxUses: body?.maxUses,
      expiresInSeconds: body?.expiresInSeconds,
    });
  }

  @Delete(':code')
  @HttpCode(204)
  remove(
    @Param('guildId') guildId: string,
    @Param('code') code: string,
    @Req() req,
  ) {
    return this.deleteInvite.execute(guildId, code, req.user.userId);
  }
}
