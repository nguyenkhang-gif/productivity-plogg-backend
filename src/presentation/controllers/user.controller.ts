import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { SearchUsersUseCase } from 'src/use-case/auth/search-users.use-case';
import { GetUserProfileUseCase } from 'src/use-case/auth/get-user-profile.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UserController {
  constructor(
    private readonly searchUsers: SearchUsersUseCase,
    private readonly getUserProfile: GetUserProfileUseCase,
  ) {}

  @Get('search')
  async search(@Query('q') q: string, @Req() req) {
    return this.searchUsers.execute(q, req.user.userId);
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    return this.getUserProfile.execute(id);
  }
}
