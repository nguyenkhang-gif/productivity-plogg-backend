import { Controller, Post, Body, UseGuards, Request, Get, Patch, Res } from '@nestjs/common';
import { Response } from 'express';
import { RegisterDto } from '../../core/dtos/register.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { RegisterUseCase } from 'src/use-case/auth/register.use-case';
import { LoginUseCase } from 'src/use-case/auth/login.use-case';
import { LogoutUseCase } from 'src/use-case/auth/logout.use-case';
import { RefreshTokenUseCase } from 'src/use-case/auth/refresh-token.use-case';
import { ProfileUseCase } from 'src/use-case/auth/profile.use-case';
import { UpdateProfileUseCase } from 'src/use-case/auth/update-profile.use-case';
import { UpdateProfileDto } from 'src/core/dtos/update-profile.dto';
import { ConfigService } from '@nestjs/config';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly profileUseCase: ProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.registerUseCase.execute(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any) {
    return this.loginUseCase.execute(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Body('refresh_token') refreshToken?: string) {
    const authHeader: string = req.headers['authorization'] ?? '';
    const accessToken = authHeader.replace('Bearer ', '');
    await this.logoutUseCase.execute(accessToken, refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.refreshTokenUseCase.execute(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.profileUseCase.execute(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.updateProfileUseCase.execute(req.user.userId, dto);
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const { access_token, refresh_token } = await this.loginUseCase.execute(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://knn-productivity.vercel.app';
    return res.redirect(`${frontendUrl}/auth/callback?token=${access_token}&refresh_token=${refresh_token}`);
  }
}
