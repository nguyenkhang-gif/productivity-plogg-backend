import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ValidateUserUseCase } from 'src/use-case/auth/validate-user.use-case';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private validateUserUseCase: ValidateUserUseCase) {
    super({ usernameField: 'identifier' });
  }

  async validate(identifier: string, pass: string): Promise<any> {
    const user = await this.validateUserUseCase.execute(identifier, pass);
    if (!user) {
      this.logger.error(`Xác thực thất bại cho: ${identifier}`);
      throw new UnauthorizedException();
    }
    return user;
  }
}
