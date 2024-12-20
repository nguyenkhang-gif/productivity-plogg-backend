import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @Length(6) // Đảm bảo mật khẩu ít nhất 6 ký tự
  password: string;
}
