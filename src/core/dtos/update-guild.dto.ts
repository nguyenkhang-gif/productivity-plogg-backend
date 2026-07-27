import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGuildDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  icon?: string;
}
