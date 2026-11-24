import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ValidateUserUseCase } from 'src/modules/identity/auth/application/validate-user.use-case';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private validateUserUseCase: ValidateUserUseCase) {
    super({ usernameField: 'identifier' });
  }

  async validate(identifier: string, pass: string): Promise<any> {
    if (
      typeof identifier !== 'string' ||
      typeof pass !== 'string' ||
      !identifier ||
      !pass ||
      identifier.length > 254 ||
      pass.length > 128
    ) {
      throw new UnauthorizedException();
    }
    const user = await this.validateUserUseCase.execute(identifier, pass);
    if (!user) {
      this.logger.warn('Authentication failed');
      throw new UnauthorizedException();
    }
    return user;
  }
}
