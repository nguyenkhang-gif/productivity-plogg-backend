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
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { CreateChannelUseCase } from 'src/modules/community/channel/application/create-channel.use-case';
import { GetChannelsUseCase } from 'src/modules/community/channel/application/get-channels.use-case';
import { UpdateChannelUseCase } from 'src/modules/community/channel/application/update-channel.use-case';
import { DeleteChannelUseCase } from 'src/modules/community/channel/application/delete-channel.use-case';
import { CreateChannelDto } from 'src/modules/community/channel/application/dto/create-channel.dto';
import { UpdateChannelDto } from 'src/modules/community/channel/application/dto/update-channel.dto';
import { ReorderChannelsDto } from 'src/modules/community/channel/application/dto/reorder-channels.dto';
import { ReorderChannelsUseCase } from 'src/modules/community/channel/application/reorder-channels.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/guilds/:guildId/channels')
export class ChannelController {
  constructor(
    private readonly createChannel: CreateChannelUseCase,
    private readonly getChannels: GetChannelsUseCase,
    private readonly updateChannel: UpdateChannelUseCase,
    private readonly deleteChannel: DeleteChannelUseCase,
    private readonly reorderChannels: ReorderChannelsUseCase,
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

  // Đặt TRƯỚC @Patch(':channelId') để 'reorder' không bị nuốt thành channelId.
  @Patch('reorder')
  @HttpCode(204)
  reorder(
    @Param('guildId') guildId: string,
    @Body() body: ReorderChannelsDto,
    @Req() req,
  ) {
    return this.reorderChannels.execute(
      guildId,
      req.user.userId,
      body.orderedIds,
    );
  }

  @Patch(':channelId')
  update(
    @Param('channelId') channelId: string,
    @Body() body: UpdateChannelDto,
    @Req() req,
  ) {
    return this.updateChannel.execute(channelId, req.user.userId, body);
  }

  @Delete(':channelId')
  @HttpCode(204)
  delete(@Param('channelId') channelId: string, @Req() req) {
    return this.deleteChannel.execute(channelId, req.user.userId);
  }
}
