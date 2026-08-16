import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetInvitePreviewUseCase } from 'src/use-case/invite/get-invite-preview.use-case';
import { JoinViaInviteUseCase } from 'src/use-case/invite/join-via-invite.use-case';

// Truy cập bằng code (chỉ cần auth, không cần là member).
@UseGuards(JwtAuthGuard)
@Controller('api/invites')
export class PublicInviteController {
  constructor(
    private readonly getPreview: GetInvitePreviewUseCase,
    private readonly joinViaInvite: JoinViaInviteUseCase,
  ) {}

  @Get(':code')
  preview(@Param('code') code: string) {
    return this.getPreview.execute(code);
  }

  @Post(':code/join')
  join(@Param('code') code: string, @Req() req) {
    return this.joinViaInvite.execute({
      code,
      userId: req.user.userId,
      username: req.user.email,
      avatar: null,
    });
  }
}
