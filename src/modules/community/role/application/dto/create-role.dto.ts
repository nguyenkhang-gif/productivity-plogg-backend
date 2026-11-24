import {
  IsInt,
  IsNotEmpty,
  Matches,
  Max,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  position?: number;

  @Matches(/^\d{1,18}$/)
  permissions: string;
}
