import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../token/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    const secret = configService.get<string>('JWT_SECRET_KEY')?.trim();
    const logger = new Logger(JwtStrategy.name);
    if (!secret) {
      logger.warn('JWT_SECRET_KEY is not defined in environment variables, using defaultSecret');
    } else {
      logger.log(`JWT_SECRET_KEY loaded (length: ${secret.length})`);
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'defaultSecret',
    });
  }

  async validate(payload: any) {
    if (payload.jti && await this.tokenService.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return { id: payload.sub, userId: payload.sub, email: payload.email, role: payload.role };
  }
}
