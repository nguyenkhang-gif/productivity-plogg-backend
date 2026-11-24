import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GuildIdPayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  guildId: string;
}

export class ChannelIdPayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  channelId: string;
}

export class SendMessagePayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  channelId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  replyToId?: string;
}

export class EditMessagePayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  messageId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  channelId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}

export class DeleteMessagePayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  messageId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  channelId: string;
}

export class AddReactionPayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  messageId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  channelId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  emoji: string;
}

export class TypingPayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  channelId: string;

  @IsIn(['start', 'stop'])
  action: 'start' | 'stop';
}
