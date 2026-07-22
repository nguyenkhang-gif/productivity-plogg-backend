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
import { JoinGuildUseCase } from 'src/use-case/guild-member/join-guild.use-case';
import { LeaveGuildUseCase } from 'src/use-case/guild-member/leave-guild.use-case';
import { KickMemberUseCase } from 'src/use-case/guild-member/kick-member.use-case';
import { AssignRoleUseCase } from 'src/use-case/guild-member/assign-role.use-case';
import { GetMembersUseCase } from 'src/use-case/guild-member/get-members.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/guilds/:guildId')
export class GuildMemberController {
  constructor(
    private readonly joinGuild: JoinGuildUseCase,
    private readonly leaveGuild: LeaveGuildUseCase,
    private readonly kickMember: KickMemberUseCase,
    private readonly assignRole: AssignRoleUseCase,
    private readonly getMembers: GetMembersUseCase,
  ) {}

  @Post('join')
  join(@Param('guildId') guildId: string, @Req() req) {
    return this.joinGuild.execute({
      guildId,
      userId: req.user.userId,
      username: req.user.email,
      avatar: null,
    });
  }

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
    @Body('roleId') roleId: string,
    @Req() req,
  ) {
    return this.assignRole.execute(guildId, req.user.userId, targetId, roleId);
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
      limit ? Number(limit) : undefined,
    );
  }
}
