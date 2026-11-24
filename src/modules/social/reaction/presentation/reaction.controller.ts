import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { ToggleReactionDto } from 'src/modules/social/reaction/application/dto/toggle-reaction.dto';
import { ToggleReactionUseCase } from 'src/modules/social/reaction/application/toggle-reaction.use-case';
import { RemoveReactionUseCase } from 'src/modules/social/reaction/application/remove-reaction.use-case';

@Controller('api/posts/:postId/react')
@UseGuards(JwtAuthGuard)
export class ReactionController {
  constructor(
    private readonly toggleReaction: ToggleReactionUseCase,
    private readonly removeReaction: RemoveReactionUseCase,
  ) {}

  @Post()
  react(
    @Param('postId') postId: string,
    @Body() body: ToggleReactionDto,
    @Req() req,
  ) {
    return this.toggleReaction.execute(
      postId,
      req.user.userId,
      body.type,
      body.icon,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('postId') postId: string, @Req() req) {
    return this.removeReaction.execute(postId, req.user.userId);
  }
}
