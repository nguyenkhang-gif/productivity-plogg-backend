import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from 'src/core/domain/repositories/user.repository.interface';
import type { UserRepository } from '../../core/domain/repositories/user.repository.interface';
import * as bcrypt from 'bcrypt';
import { User } from 'src/core/domain/entities/user.entity';

@Injectable()
export class ValidateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(
    identifier: string,
    pass: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    if (
      typeof identifier !== 'string' ||
      typeof pass !== 'string' ||
      !identifier ||
      !pass ||
      identifier.length > 254 ||
      pass.length > 128
    ) {
      return null;
    }

    let user = await this.userRepository.findByEmail(identifier);

    if (!user) {
      user = await this.userRepository.findByUsername(identifier);
    }

    if (user?.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash: _passwordHash, ...result } = user;
      return result;
    }
    return null;
  }
}
