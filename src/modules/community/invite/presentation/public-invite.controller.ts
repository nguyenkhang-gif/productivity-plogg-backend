import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { displayNameFromClaims } from 'src/modules/community/message/domain/display-name';
import { GetInvitePreviewUseCase } from 'src/modules/community/invite/application/get-invite-preview.use-case';
import { JoinViaInviteUseCase } from 'src/modules/community/invite/application/join-via-invite.use-case';

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
      username: displayNameFromClaims(req.user),
      avatar: null,
    });
  }
}
