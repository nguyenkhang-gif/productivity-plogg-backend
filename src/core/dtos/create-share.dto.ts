import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateShareDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  caption: string;
}
