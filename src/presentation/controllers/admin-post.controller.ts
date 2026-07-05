import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { RolesGuard } from 'src/presentation/guards/roles.guard';
import { Roles } from 'src/presentation/decorators/roles.decorator';
import { AdminGetAllPostsUseCase } from 'src/use-case/post/admin-get-all-posts.use-case';
import { AdminGetPostUseCase } from 'src/use-case/post/admin-get-post.use-case';
import { AdminForceDeletePostUseCase } from 'src/use-case/post/admin-force-delete-post.use-case';
import { ApprovePostUseCase } from 'src/use-case/post/approve-post.use-case';
import { RejectPostUseCase } from 'src/use-case/post/reject-post.use-case';
import { AdminPostQueryDto } from 'src/core/dtos/admin-post-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Controller('api/admin/posts')
export class AdminPostController {
  constructor(
    private readonly getAllPosts: AdminGetAllPostsUseCase,
    private readonly getPost: AdminGetPostUseCase,
    private readonly approvePost: ApprovePostUseCase,
    private readonly rejectPost: RejectPostUseCase,
    private readonly forceDeletePost: AdminForceDeletePostUseCase,
  ) {}

  @Get()
  list(@Query() query: AdminPostQueryDto) {
    return this.getAllPosts.execute(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.getPost.execute(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Req() req) {
    return this.approvePost.execute(id, req.user.userId);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req,
  ) {
    return this.rejectPost.execute(id, req.user.userId, reason);
  }

  @Delete(':id')
  @HttpCode(204)
  forceDelete(@Param('id') id: string) {
    return this.forceDeletePost.execute(id);
  }
}
