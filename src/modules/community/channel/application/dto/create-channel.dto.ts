import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(['TEXT', 'CATEGORY'])
  @IsOptional()
  type?: 'TEXT' | 'CATEGORY';

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1024)
  topic?: string;
}
