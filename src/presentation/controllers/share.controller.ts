import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/presentation/guards/optional-jwt-auth.guard';
import { CreateShareDto } from 'src/core/dtos/create-share.dto';
import { SharePostUseCase } from 'src/use-case/share/share-post.use-case';
import { UnsharePostUseCase } from 'src/use-case/share/unshare-post.use-case';
import { GetShareInfoUseCase } from 'src/use-case/share/get-share-info.use-case';

@Controller('api/posts/:postId/share')
export class ShareController {
  constructor(
    private readonly sharePost: SharePostUseCase,
    private readonly unsharePost: UnsharePostUseCase,
    private readonly getShareInfo: GetShareInfoUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  share(
    @Param('postId') postId: string,
    @Body() body: CreateShareDto,
    @Req() req,
  ) {
    return this.sharePost.execute(postId, req.user.userId, body.caption);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  unshare(@Param('postId') postId: string, @Req() req) {
    return this.unsharePost.execute(postId, req.user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  info(@Param('postId') postId: string, @Req() req) {
    return this.getShareInfo.execute(postId, req.user?.userId);
  }
}
