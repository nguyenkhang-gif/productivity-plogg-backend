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
import { Throttle } from '@nestjs/throttler';
import { RegisterDto } from '../application/dto/register.dto';
import { LoginDto } from '../application/dto/login.dto';
import { OAuthExchangeDto } from '../application/dto/oauth-exchange.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { RegisterUseCase } from 'src/modules/identity/auth/application/register.use-case';
import { LoginUseCase } from 'src/modules/identity/auth/application/login.use-case';
import { LogoutUseCase } from 'src/modules/identity/auth/application/logout.use-case';
import { RefreshTokenUseCase } from 'src/modules/identity/auth/application/refresh-token.use-case';
import { ProfileUseCase } from 'src/modules/identity/auth/application/profile.use-case';
import { UpdateProfileUseCase } from 'src/modules/identity/auth/application/update-profile.use-case';
import { ListSessionsUseCase } from 'src/modules/identity/auth/application/list-sessions.use-case';
import { RevokeSessionUseCase } from 'src/modules/identity/auth/application/revoke-session.use-case';
import { UpdateProfileDto } from 'src/modules/identity/user/application/dto/update-profile.dto';
import { ConfigService } from '@nestjs/config';
import { TokenService } from 'src/modules/identity/auth/infrastructure/token/token.service';
import { UnauthorizedException } from '@nestjs/common';

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
    private readonly tokenService: TokenService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.registerUseCase.execute(registerDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any, @Body() _dto: LoginDto) {
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

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
    if (this.configService.get<string>('OAUTH_CODE_EXCHANGE') === 'true') {
      const code = await this.tokenService.createOAuthCode({
        access_token,
        refresh_token,
      });
      return res.redirect(
        `${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}`,
      );
    }
    const redirectUrl = `${frontendUrl}/auth/callback?token=${access_token}&refresh_token=${refresh_token}`;
    return res.redirect(redirectUrl);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('oauth/exchange')
  async oauthExchange(@Body() dto: OAuthExchangeDto) {
    const tokens = await this.tokenService.consumeOAuthCode(dto.code);
    if (!tokens) throw new UnauthorizedException('Invalid or expired code');
    return tokens;
  }
}
