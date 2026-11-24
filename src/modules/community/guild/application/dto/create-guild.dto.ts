import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGuildDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  icon?: string;
}
