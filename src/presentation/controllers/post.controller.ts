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

@Controller('api/posts')
export class PostController {
  constructor(
    private readonly createPost: CreatePostUseCase,
    private readonly getPosts: GetPostsUseCase,
    private readonly getPost: GetPostUseCase,
    private readonly getPostsByAuthor: GetPostsByAuthorUseCase,
    private readonly updatePost: UpdatePostUseCase,
    private readonly deletePost: DeletePostUseCase,
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
    @Req() req,
  ) {
    return this.getPosts.execute(Number(page), Number(limit), req.user.userId);
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
}
