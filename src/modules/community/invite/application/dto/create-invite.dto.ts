import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @IsInt()
  @Min(1)
  @Max(1000000)
  @IsOptional()
  maxUses?: number;

  @IsInt()
  @Min(60)
  @Max(31536000)
  @IsOptional()
  expiresInSeconds?: number;
}
