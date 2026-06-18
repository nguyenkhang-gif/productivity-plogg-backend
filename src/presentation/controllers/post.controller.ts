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
import { CreatePostDto } from 'src/core/dtos/create-post.dto';
import { UpdatePostDto } from 'src/core/dtos/update-post.dto';
import { CreatePostUseCase } from 'src/use-case/post/create-post.use-case';
import { GetPostsUseCase } from 'src/use-case/post/get-posts.use-case';
import { GetPostUseCase } from 'src/use-case/post/get-post.use-case';
import { GetPostsByAuthorUseCase } from 'src/use-case/post/get-posts-by-author.use-case';
import { UpdatePostUseCase } from 'src/use-case/post/update-post.use-case';
import { DeletePostUseCase } from 'src/use-case/post/delete-post.use-case';
import { IncrementViewUseCase } from 'src/use-case/post/increment-view.use-case';
import { GetTrendingPostsUseCase } from 'src/use-case/post/get-trending-posts.use-case';
import { GetMyStatsUseCase } from 'src/use-case/post/get-my-stats.use-case';
import { AddBookmarkUseCase } from 'src/use-case/bookmark/add-bookmark.use-case';
import { RemoveBookmarkUseCase } from 'src/use-case/bookmark/remove-bookmark.use-case';

@Controller('api/posts')
export class PostController {
  constructor(
    private readonly createPost: CreatePostUseCase,
    private readonly getPosts: GetPostsUseCase,
    private readonly getPost: GetPostUseCase,
    private readonly getPostsByAuthor: GetPostsByAuthorUseCase,
    private readonly updatePost: UpdatePostUseCase,
    private readonly deletePost: DeletePostUseCase,
    private readonly incrementView: IncrementViewUseCase,
    private readonly getTrendingPosts: GetTrendingPostsUseCase,
    private readonly getMyStats: GetMyStatsUseCase,
    private readonly addBookmark: AddBookmarkUseCase,
    private readonly removeBookmark: RemoveBookmarkUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreatePostDto, @Req() req) {
    return this.createPost.execute({ ...body, authorId: req.user.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('categoryId') categoryId?: string,
    @Query('tags') tags?: string,
    @Query('excludeId') excludeId?: string,
    @Query('sortByUpdatedAt') sortByUpdatedAt?: string,
    @Req() req = null,
  ) {
    const filter = {
      categoryId,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      excludeId,
      sortByUpdatedAt: sortByUpdatedAt === '1' ? 1 as const : sortByUpdatedAt === '-1' ? -1 as const : undefined,
    };
    return this.getPosts.execute(Number(page), Number(limit), req.user.userId, filter);
  }

  // ── Static routes BEFORE :id ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('trending')
  trending(@Query('limit') limit = 5, @Req() req) {
    return this.getTrendingPosts.execute(Number(limit), req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/me')
  myStats(@Req() req) {
    return this.getMyStats.execute(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('author/:authorId')
  findByAuthor(
    @Param('authorId') authorId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Req() req,
  ) {
    return this.getPostsByAuthor.execute(authorId, Number(page), Number(limit), req.user.userId);
  }

  // ── :id routes ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.getPost.execute(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdatePostDto, @Req() req) {
    return this.updatePost.execute(id, req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req) {
    return this.deletePost.execute(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  recordView(@Param('id') id: string, @Req() req) {
    return this.incrementView.execute(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  bookmark(@Param('id') id: string, @Req() req) {
    return this.addBookmark.execute(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  unbookmark(@Param('id') id: string, @Req() req) {
    return this.removeBookmark.execute(req.user.userId, id);
  }
}
