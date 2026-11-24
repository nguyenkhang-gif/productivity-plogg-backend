import { IsEnum, IsOptional, IsUrl } from 'class-validator';

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  HAHA = 'haha',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
}

export class ToggleReactionDto {
  @IsEnum(ReactionType)
  type: ReactionType;

  @IsOptional()
  @IsUrl()
  icon?: string;
}
