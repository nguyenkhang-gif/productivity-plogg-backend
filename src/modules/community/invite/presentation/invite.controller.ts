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
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { CreateInviteUseCase } from 'src/modules/community/invite/application/create-invite.use-case';
import { DeleteInviteUseCase } from 'src/modules/community/invite/application/delete-invite.use-case';
import { CreateInviteDto } from 'src/modules/community/invite/application/dto/create-invite.dto';

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
