import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { RolesGuard } from 'src/presentation/guards/roles.guard';
import { Roles } from 'src/presentation/decorators/roles.decorator';
import { SearchUsersUseCase } from 'src/use-case/auth/search-users.use-case';
import { GetUserProfileUseCase } from 'src/use-case/auth/get-user-profile.use-case';
import { GetSuggestionsUseCase } from 'src/use-case/user/get-suggestions.use-case';
import { ChangeUserRoleUseCase } from 'src/use-case/user/change-user-role.use-case';
import { ChangeUserRoleDto } from 'src/core/dtos/change-user-role.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UserController {
  constructor(
    private readonly searchUsers: SearchUsersUseCase,
    private readonly getUserProfile: GetUserProfileUseCase,
    private readonly getSuggestions: GetSuggestionsUseCase,
    private readonly changeUserRole: ChangeUserRoleUseCase,
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

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/role')
  async setRole(
    @Param('id') id: string,
    @Body() body: ChangeUserRoleDto,
    @Req() req,
  ) {
    return this.changeUserRole.execute(id, body.role, req.user.userId);
  }
}
