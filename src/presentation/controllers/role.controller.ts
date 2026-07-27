import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { CreateRoleDto } from 'src/core/dtos/create-role.dto';
import { UpdateRoleDto } from 'src/core/dtos/update-role.dto';
import { CreateRoleUseCase } from 'src/use-case/role/create-role.use-case';
import { GetRolesUseCase } from 'src/use-case/role/get-roles.use-case';
import { UpdateRoleUseCase } from 'src/use-case/role/update-role.use-case';
import { DeleteRoleUseCase } from 'src/use-case/role/delete-role.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/guilds/:guildId/roles')
export class RoleController {
  constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly getRoles: GetRolesUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Post()
  create(
    @Param('guildId') guildId: string,
    @Body() body: CreateRoleDto,
    @Req() req,
  ) {
    return this.createRole.execute({
      guildId,
      actorId: req.user.userId,
      name: body.name,
      color: body.color,
      position: body.position,
      permissions: BigInt(body.permissions),
    });
  }

  @Get()
  list(@Param('guildId') guildId: string, @Req() req) {
    return this.getRoles.execute(guildId, req.user.userId);
  }

  @Patch(':roleId')
  update(
    @Param('roleId') roleId: string,
    @Body() body: UpdateRoleDto,
    @Req() req,
  ) {
    return this.updateRole.execute(roleId, req.user.userId, {
      name: body.name,
      color: body.color,
      position: body.position,
      permissions:
        body.permissions !== undefined ? BigInt(body.permissions) : undefined,
    });
  }

  @Delete(':roleId')
  @HttpCode(204)
  delete(@Param('roleId') roleId: string, @Req() req) {
    return this.deleteRole.execute(roleId, req.user.userId);
  }
}
