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
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { RolesGuard } from 'src/shared/security/roles.guard';
import { Roles } from 'src/shared/security/roles.decorator';
import { GetAllUsersUseCase } from 'src/modules/identity/user/application/get-all-users.use-case';
import { ChangeUserRoleUseCase } from 'src/modules/identity/user/application/change-user-role.use-case';
import { AdminUserQueryDto } from 'src/modules/identity/user/application/dto/admin-user-query.dto';
import { ChangeUserRoleDto } from 'src/modules/identity/user/application/dto/change-user-role.dto';

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
