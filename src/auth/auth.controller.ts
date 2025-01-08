import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/login.dto';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';
import { AuthGuard } from './auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly AuthService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Post('/auth-with-jwt')
  async loginWithJwt(@Body() body: { token: string }, @Res() res) {
    try {
      const { token } = body;
      const { refresh_token, access_token, user } =
        await this.AuthService.signUpWithToken(token);
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true, // Chỉ gửi qua HTTPS
        sameSite: 'None', // Hoặc 'lax' nếu cần
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      });

      this.refreshTokenService.createRefreshToken(
        user._id,
        refresh_token,
        7 * 24 * 60 * 60,
      );
      return res.status(HttpStatus.OK).json({
        access_token,
        user,
      });
    } catch (err) {
      console.log(err.message);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid credentials', err: err.message });
    }
  }

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res() res,
  ) {
    try {
      // TODO : check username and password -> return access_token, refresh_token, user
      const respon = await this.AuthService.login(body);
      const { access_token, refresh_token, user } = respon;
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true, // Chỉ gửi qua HTTPS
        sameSite: 'strict', // Hoặc 'lax' nếu cần
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      });

      this.refreshTokenService.createRefreshToken(
        user._id,
        refresh_token,
        7 * 24 * 60 * 60,
      );
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

  @Post('signup')
  async signup(@Body() body: SignUpDto, @Res() res) {
    try {
      const data = await this.AuthService.signUp(body);
      return res.status(HttpStatus.OK).json(data);
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: err.message });
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

      const isRevoked =
        await this.refreshTokenService.checkRevoked(refresh_token);

      if (isRevoked) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ message: 'Refresh token revoked' });
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

  @Post('logout')
  async logout(@Req() req, @Res() res) {
    try {
      const refresh_token = req.cookies.refresh_token;
      if (!refresh_token) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ message: 'Refresh token not found' });
      }
      const isRevoked =
        await this.refreshTokenService.revokeRefreshToken(refresh_token);
      if (isRevoked) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ message: 'Refresh token revoked' });
      }
      await this.AuthService.logout(refresh_token);
      res.clearCookie('refresh_token');
      return res.status(HttpStatus.OK).json({ message: 'Logout success' });
    } catch (e) {
      console.log(e);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid credentials' });
    }
  }
  @UseGuards(AuthGuard)
  @Post('profile')
  async profile(@Req() req, @Res() res) {
    try {
      console.log('user', req.user, res.user);

      const { userId } = req.user;
      const userProfile = await this.AuthService.profile(userId);
      return res.status(HttpStatus.OK).json(userProfile);
    } catch (e) {
      console.log(e);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid credentials' });
    }
  }
}
