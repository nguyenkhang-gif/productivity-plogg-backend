import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1024)
  topic?: string;
}
