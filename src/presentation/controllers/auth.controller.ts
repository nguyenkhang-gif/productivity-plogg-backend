import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Patch,
  Res,
  Delete,
  Param,
  Headers,
} from '@nestjs/common';
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
import { ListSessionsUseCase } from 'src/use-case/auth/list-sessions.use-case';
import { RevokeSessionUseCase } from 'src/use-case/auth/revoke-session.use-case';
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
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.registerUseCase.execute(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any) {
    const metadata = {
      userAgent: req.headers['user-agent'] ?? '',
      ip: req.ip ?? req.headers['x-forwarded-for'] ?? '',
    };
    return this.loginUseCase.execute(req.user, metadata);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: any,
    @Body('refresh_token') refreshToken?: string,
  ) {
    const authHeader: string = req.headers['authorization'] ?? '';
    const accessToken = authHeader.replace('Bearer ', '');
    await this.logoutUseCase.execute(
      accessToken,
      req.user.userId,
      refreshToken,
    );
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

  // ── Session Management ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(
    @Request() req: any,
    @Headers('x-session-id') currentSessionId?: string,
  ) {
    return this.listSessionsUseCase.execute(req.user.userId, currentSessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  async revokeSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    await this.revokeSessionUseCase.revokeOne(req.user.userId, sessionId);
    return { message: 'Session revoked' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  async revokeAllSessions(
    @Request() req: any,
    @Headers('x-session-id') currentSessionId?: string,
  ) {
    await this.revokeSessionUseCase.revokeAll(
      req.user.userId,
      currentSessionId,
    );
    return { message: 'All other sessions revoked' };
  }

  // ── OAuth ─────────────────────────────────────────────────────────────────

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const metadata = {
      userAgent: req.headers['user-agent'] ?? '',
      ip: req.ip ?? req.headers['x-forwarded-for'] ?? '',
    };
    const { access_token, refresh_token } = await this.loginUseCase.execute(
      req.user,
      metadata,
    );
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://knn-productivity.vercel.app';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${access_token}&refresh_token=${refresh_token}`;
    console.log(
      '[GoogleCallback] FRONTEND_URL env:',
      this.configService.get<string>('FRONTEND_URL'),
    );
    console.log('[GoogleCallback] Redirecting to:', redirectUrl.split('?')[0]);
    return res.redirect(redirectUrl);
  }
}
