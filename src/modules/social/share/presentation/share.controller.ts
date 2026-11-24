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
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/shared/security/optional-jwt-auth.guard';
import { CreateShareDto } from 'src/modules/social/share/application/dto/create-share.dto';
import { SharePostUseCase } from 'src/modules/social/share/application/share-post.use-case';
import { UnsharePostUseCase } from 'src/modules/social/share/application/unshare-post.use-case';
import { GetShareInfoUseCase } from 'src/modules/social/share/application/get-share-info.use-case';

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
