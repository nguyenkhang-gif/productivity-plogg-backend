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
import { GetAllUsersUseCase } from 'src/use-case/user/get-all-users.use-case';
import { ChangeUserRoleUseCase } from 'src/use-case/user/change-user-role.use-case';
import { AdminUserQueryDto } from 'src/core/dtos/admin-user-query.dto';
import { ChangeUserRoleDto } from 'src/core/dtos/change-user-role.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/users')
export class AdminUserController {
  constructor(
    private readonly getAllUsers: GetAllUsersUseCase,
    private readonly changeUserRole: ChangeUserRoleUseCase,
  ) {}

  @Get()
  async listUsers(@Query() query: AdminUserQueryDto) {
    return this.getAllUsers.execute(query);
  }

  @Patch(':id/role')
  async setRole(
    @Param('id') id: string,
    @Body() body: ChangeUserRoleDto,
    @Req() req,
  ) {
    return this.changeUserRole.execute(id, body.role, req.user.userId);
  }
}
