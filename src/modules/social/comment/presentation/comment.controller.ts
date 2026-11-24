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
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { clampPagination } from 'src/shared/http/pagination';
import { CreateCommentDto } from 'src/modules/social/comment/application/dto/create-comment.dto';
import { UpdateCommentDto } from 'src/modules/social/comment/application/dto/update-comment.dto';
import { CreateCommentUseCase } from 'src/modules/social/comment/application/create-comment.use-case';
import { GetCommentsByPostUseCase } from 'src/modules/social/comment/application/get-comments-by-post.use-case';
import { UpdateCommentUseCase } from 'src/modules/social/comment/application/update-comment.use-case';
import { DeleteCommentUseCase } from 'src/modules/social/comment/application/delete-comment.use-case';

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
  create(
    @Param('postId') postId: string,
    @Body() body: CreateCommentDto,
    @Req() req,
  ) {
    return this.createComment.execute({
      postId,
      authorId: req.user.userId,
      content: body.content,
      iconUrl: body.iconUrl,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Param('postId') postId: string,
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const pg = clampPagination(page, limit);
    return this.getCommentsByPost.execute(
      postId,
      req.user.userId,
      pg.page,
      pg.limit,
    );
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
