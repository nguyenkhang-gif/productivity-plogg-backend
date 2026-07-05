import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  PostModerationStatus,
  PostVisibility,
} from 'src/core/domain/entities/post.entity';

export class AdminPostQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsEnum(['APPROVED', 'PENDING', 'REJECTED'] as PostModerationStatus[])
  moderationStatus?: PostModerationStatus;

  @IsOptional()
  @IsEnum(['PUBLIC', 'FRIENDS', 'PRIVATE'] as PostVisibility[])
  visibility?: PostVisibility;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
