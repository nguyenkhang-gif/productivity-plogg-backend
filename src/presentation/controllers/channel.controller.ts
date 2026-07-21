import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateChannelUseCase } from 'src/use-case/channel/create-channel.use-case';
import { GetChannelsUseCase } from 'src/use-case/channel/get-channels.use-case';
import { DeleteChannelUseCase } from 'src/use-case/channel/delete-channel.use-case';
import { CreateChannelDto } from 'src/core/dtos/create-channel.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/guilds/:guildId/channels')
export class ChannelController {
  constructor(
    private readonly createChannel: CreateChannelUseCase,
    private readonly getChannels: GetChannelsUseCase,
    private readonly deleteChannel: DeleteChannelUseCase,
  ) {}

  @Post()
  create(
    @Param('guildId') guildId: string,
    @Body() body: CreateChannelDto,
    @Req() req,
  ) {
    return this.createChannel.execute({
      guildId,
      actorId: req.user.userId,
      name: body.name,
      type: body.type,
      parentId: body.parentId,
      topic: body.topic,
    });
  }

  @Get()
  list(@Param('guildId') guildId: string, @Req() req) {
    return this.getChannels.execute(guildId, req.user.userId);
  }

  @Delete(':channelId')
  @HttpCode(204)
  delete(@Param('channelId') channelId: string, @Req() req) {
    return this.deleteChannel.execute(channelId, req.user.userId);
  }
}
