import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('get')
  getService(): string {
    return 'this is auth service';
  }

  @Post('login')
  async login(@Body() body: LoginUserDto, @Res() res: Response) {
    try {
      const result = await this.authService.login(body);

      return res.status(HttpStatus.OK).json({
        token: result.token, // Trả token
        user: result.user, // Trả thông tin người dùng
      });
    } catch (error) {
      console.error('Login error:', error.message);
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: error.message });
    }
  }

  @Post('signup')
  async signup(
    @Body()
    body: {
      fullName: string;
      username: string;
      password: string;
      confirmPassword: string;
      gender: string;
    },
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.signup(body);

      return res.status(HttpStatus.OK).json({
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      console.error('Signup error:', error.message);
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: error.message });
    }
  }
}
