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
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { ToggleReactionDto } from 'src/core/dtos/toggle-reaction.dto';
import { ToggleReactionUseCase } from 'src/use-case/reaction/toggle-reaction.use-case';
import { RemoveReactionUseCase } from 'src/use-case/reaction/remove-reaction.use-case';

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
    return this.toggleReaction.execute(postId, req.user.userId, body.type, body.icon);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('postId') postId: string, @Req() req) {
    return this.removeReaction.execute(postId, req.user.userId);
  }
}
