import {
  IsInt,
  Matches,
  Max,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  position?: number;

  @Matches(/^\d{1,18}$/)
  @IsOptional()
  permissions?: string;
}
