import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
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
    this.logger.log(`Validating JWT payload for user: ${payload.sub || payload.email}`);
    return { id: payload.sub, userId: payload.sub, email: payload.email, role: payload.role };
  }
}
