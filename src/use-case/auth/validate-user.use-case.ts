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
    let user = await this.userRepository.findByEmail(identifier);
    console.log(`Validating user with identifier: `,user);
    
    
    if (!user) {
      user = await this.userRepository.findByUsername(identifier);
      console.log(`Validating user with identifier layer2: `,user);
    }

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      console.log(`Password for user ${user.username} is valid.`);
      
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }
}
