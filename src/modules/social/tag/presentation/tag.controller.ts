import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { clampPagination } from 'src/shared/http/pagination';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { SearchTagsUseCase } from 'src/modules/social/tag/application/search-tags.use-case';
import { GetTrendingTagsUseCase } from 'src/modules/social/tag/application/get-trending-tags.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/tags')
export class TagController {
  constructor(
    private readonly searchTags: SearchTagsUseCase,
    private readonly getTrendingTags: GetTrendingTagsUseCase,
  ) {}

  @Get('trending')
  trending(@Query('limit') limit = 10) {
    const pg = clampPagination(1, limit, 50, 10);
    return this.getTrendingTags.execute(pg.limit);
  }

  @Get()
  search(@Query('search') search = '', @Query('limit') limit = 10) {
    const pg = clampPagination(1, limit, 50, 10);
    return this.searchTags.execute(search, pg.limit);
  }
}
