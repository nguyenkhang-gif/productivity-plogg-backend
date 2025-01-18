import { IsString, IsOptional, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  username: string;
  password: string;
}

export class SignUpDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ?? 'John Doe') // Giá trị mặc định
  fullName: string;

  @IsOptional()
  @IsString()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ?? 'male') // Giá trị mặc định
  gender: string;

  @IsOptional()
  @Transform(({ value }) => value ?? false)
  noHashPassword: boolean;
}
