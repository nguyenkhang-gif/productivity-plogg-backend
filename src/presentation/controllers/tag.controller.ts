import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { SearchTagsUseCase } from 'src/use-case/tag/search-tags.use-case';
import { GetTrendingTagsUseCase } from 'src/use-case/tag/get-trending-tags.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/tags')
export class TagController {
  constructor(
    private readonly searchTags: SearchTagsUseCase,
    private readonly getTrendingTags: GetTrendingTagsUseCase,
  ) {}

  @Get('trending')
  trending(@Query('limit') limit = 10) {
    return this.getTrendingTags.execute(Number(limit));
  }

  @Get()
  search(@Query('search') search = '', @Query('limit') limit = 10) {
    return this.searchTags.execute(search, Number(limit));
  }
}
