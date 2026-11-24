import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AssignRoleDto } from 'src/core/dtos/assign-role.dto';
import { clampLimit } from 'src/infrastructure/guild/pagination';
import { LeaveGuildUseCase } from 'src/use-case/guild-member/leave-guild.use-case';
import { KickMemberUseCase } from 'src/use-case/guild-member/kick-member.use-case';
import { AssignRoleUseCase } from 'src/use-case/guild-member/assign-role.use-case';
import { RemoveRoleUseCase } from 'src/use-case/guild-member/remove-role.use-case';
import { GetMembersUseCase } from 'src/use-case/guild-member/get-members.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/guilds/:guildId')
export class GuildMemberController {
  constructor(
    private readonly leaveGuild: LeaveGuildUseCase,
    private readonly kickMember: KickMemberUseCase,
    private readonly assignRole: AssignRoleUseCase,
    private readonly removeRole: RemoveRoleUseCase,
    private readonly getMembers: GetMembersUseCase,
  ) {}

  @Delete('leave')
  @HttpCode(204)
  leave(@Param('guildId') guildId: string, @Req() req) {
    return this.leaveGuild.execute(guildId, req.user.userId);
  }

  @Delete('members/:userId')
  @HttpCode(204)
  kick(
    @Param('guildId') guildId: string,
    @Param('userId') targetId: string,
    @Req() req,
  ) {
    return this.kickMember.execute(guildId, req.user.userId, targetId);
  }

  @Post('members/:userId/roles')
  assignRoleToMember(
    @Param('guildId') guildId: string,
    @Param('userId') targetId: string,
    @Body() body: AssignRoleDto,
    @Req() req,
  ) {
    return this.assignRole.execute(
      guildId,
      req.user.userId,
      targetId,
      body.roleId,
    );
  }

  @Delete('members/:userId/roles/:roleId')
  @HttpCode(204)
  removeRoleFromMember(
    @Param('guildId') guildId: string,
    @Param('userId') targetId: string,
    @Param('roleId') roleId: string,
    @Req() req,
  ) {
    return this.removeRole.execute(guildId, req.user.userId, targetId, roleId);
  }

  @Get('members')
  list(
    @Param('guildId') guildId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req,
  ) {
    return this.getMembers.execute(
      guildId,
      req.user.userId,
      cursor,
      clampLimit(limit, 50),
    );
  }
}
