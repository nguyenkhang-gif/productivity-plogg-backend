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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { CreateCommentDto } from 'src/core/dtos/create-comment.dto';
import { UpdateCommentDto } from 'src/core/dtos/update-comment.dto';
import { CreateCommentUseCase } from 'src/use-case/comment/create-comment.use-case';
import { GetCommentsByPostUseCase } from 'src/use-case/comment/get-comments-by-post.use-case';
import { UpdateCommentUseCase } from 'src/use-case/comment/update-comment.use-case';
import { DeleteCommentUseCase } from 'src/use-case/comment/delete-comment.use-case';

@Controller('api/posts/:postId/comments')
export class CommentController {
  constructor(
    private readonly createComment: CreateCommentUseCase,
    private readonly getCommentsByPost: GetCommentsByPostUseCase,
    private readonly updateComment: UpdateCommentUseCase,
    private readonly deleteComment: DeleteCommentUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Param('postId') postId: string, @Body() body: CreateCommentDto, @Req() req) {
    return this.createComment.execute({ postId, authorId: req.user.userId, content: body.content, iconUrl: body.iconUrl });
  }

  @Get()
  findAll(
    @Param('postId') postId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.getCommentsByPost.execute(postId, Number(page), Number(limit));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCommentDto, @Req() req) {
    return this.updateComment.execute(id, req.user.userId, body.content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req) {
    return this.deleteComment.execute(id, req.user.userId);
  }
}
