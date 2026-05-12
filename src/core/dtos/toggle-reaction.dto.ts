import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ToggleReactionDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsUrl()
  icon?: string;
}
