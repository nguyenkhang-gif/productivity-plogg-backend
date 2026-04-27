import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err, user, info) {
    if (err || !user) {
      this.logger.error('JWT Auth Guard failed');
      this.logger.error(`Error: ${err}`);
      this.logger.error(`Info: ${info}`);
      this.logger.error(`User: ${JSON.stringify(user)}`);
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
