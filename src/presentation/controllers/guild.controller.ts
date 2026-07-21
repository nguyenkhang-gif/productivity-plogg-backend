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
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateGuildUseCase } from 'src/use-case/guild/create-guild.use-case';
import { GetMyGuildsUseCase } from 'src/use-case/guild/get-my-guilds.use-case';
import { GetGuildUseCase } from 'src/use-case/guild/get-guild.use-case';
import { UpdateGuildUseCase } from 'src/use-case/guild/update-guild.use-case';
import { DeleteGuildUseCase } from 'src/use-case/guild/delete-guild.use-case';
import { CreateGuildDto } from 'src/core/dtos/create-guild.dto';
import { UpdateGuildDto } from 'src/core/dtos/update-guild.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/guilds')
export class GuildController {
  constructor(
    private readonly createGuild: CreateGuildUseCase,
    private readonly getMyGuilds: GetMyGuildsUseCase,
    private readonly getGuild: GetGuildUseCase,
    private readonly updateGuild: UpdateGuildUseCase,
    private readonly deleteGuild: DeleteGuildUseCase,
  ) {}

  @Post()
  create(@Body() body: CreateGuildDto, @Req() req) {
    return this.createGuild.execute({
      ownerId: req.user.userId,
      ownerUsername: req.user.email,
      name: body.name,
      icon: body.icon,
    });
  }

  @Get()
  getMine(@Req() req) {
    return this.getMyGuilds.execute(req.user.userId);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req) {
    return this.getGuild.execute(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateGuildDto, @Req() req) {
    return this.updateGuild.execute(id, req.user.userId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string, @Req() req) {
    return this.deleteGuild.execute(id, req.user.userId);
  }
}
