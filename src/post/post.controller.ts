import {
  Body,
  Controller,
  Get,
  Param,
  Post as HttpPost,
  Delete,
  Patch,
  Query,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('api/posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  /**
   * POST /posts
   */

  @UseGuards(AuthGuard)
  @HttpPost()
  create(@Body() body: CreatePostDto, @Req() req) {
    const userId = req.user.userId;
    return this.postService.create({ ...body, userId });
  }

  /**
   * GET /posts?page=1&limit=10
   */
  @Get()
  findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ) {
    return this.postService.findAll(page, limit);
  }

  /**
   * GET /posts/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post id');
    }
    return this.postService.findOne(id);
  }

  /**
   * PATCH /posts/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdatePostDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post id');
    }
    return this.postService.update(id, body);
  }

  /**
   * DELETE /posts/:id
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post id');
    }
    return this.postService.remove(id);
  }
}
