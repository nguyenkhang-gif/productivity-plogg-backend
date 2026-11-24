import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { clampPagination } from 'src/shared/http/pagination';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { SearchUsersUseCase } from 'src/modules/identity/auth/application/search-users.use-case';
import { GetUserProfileUseCase } from 'src/modules/identity/auth/application/get-user-profile.use-case';
import { GetSuggestionsUseCase } from 'src/modules/identity/user/application/get-suggestions.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UserController {
  constructor(
    private readonly searchUsers: SearchUsersUseCase,
    private readonly getUserProfile: GetUserProfileUseCase,
    private readonly getSuggestions: GetSuggestionsUseCase,
  ) {}

  @Get('search')
  async search(@Query('q') q: string, @Req() req) {
    return this.searchUsers.execute(q, req.user.userId);
  }

  @Get('suggestions')
  async suggestions(@Query('limit') limit = 5, @Req() req) {
    const pg = clampPagination(1, limit, 50, 5);
    return this.getSuggestions.execute(req.user.userId, pg.limit);
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string, @Req() req) {
    return this.getUserProfile.execute(id, req.user.userId);
  }
}
