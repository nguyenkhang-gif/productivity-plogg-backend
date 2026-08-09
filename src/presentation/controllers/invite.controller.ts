import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateInviteUseCase } from 'src/use-case/invite/create-invite.use-case';

// Quản lý invite trong guild (cần MANAGE_GUILD — enforce trong use-case).
@UseGuards(JwtAuthGuard)
@Controller('api/guilds/:guildId/invites')
export class InviteController {
  constructor(private readonly createInvite: CreateInviteUseCase) {}

  @Post()
  create(@Param('guildId') guildId: string, @Req() req) {
    return this.createInvite.execute(guildId, req.user.userId);
  }
}
