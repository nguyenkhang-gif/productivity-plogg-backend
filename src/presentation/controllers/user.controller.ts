import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { SearchUsersUseCase } from 'src/use-case/auth/search-users.use-case';
import { GetUserProfileUseCase } from 'src/use-case/auth/get-user-profile.use-case';
import { GetSuggestionsUseCase } from 'src/use-case/user/get-suggestions.use-case';

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
    return this.getSuggestions.execute(req.user.userId, Number(limit));
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    return this.getUserProfile.execute(id);
  }
}
