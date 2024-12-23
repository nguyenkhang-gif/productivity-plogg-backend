import { Body, Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}
  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res() res,
  ) {
    try {
      const respon = await this.AuthService.login(body);
      const { access_token, refresh_token, user } = respon;
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true, // Chỉ gửi qua HTTPS
        sameSite: 'strict', // Hoặc 'lax' nếu cần
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      });
      return res.status(HttpStatus.OK).json({
        access_token,
        user,
      });
    } catch (e) {
      console.log(e);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid credentials' });
    }
  }
  @Post('refresh-token')
  async refreshToken(@Res() res, @Req() req) {
    try {
      const refresh_token = req.cookies.refresh_token;

      if (!refresh_token) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ message: 'Refresh token not found' });
      }

      const { access_token, refresh_token: newToken } =
        await this.AuthService.refreshToken(refresh_token);

      res.cookie('refresh_token', newToken, {
        httpOnly: true,
        secure: true, // Chỉ gửi qua HTTPS
        sameSite: 'strict', // Hoặc 'lax' nếu cần
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      });

      return res.status(HttpStatus.OK).json({
        access_token,
      });
    } catch (e) {
      console.log(e);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid credentials debug 1' });
    }
  }
}
