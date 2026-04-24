
import {Inject, Injectable, NotFoundException} from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/core/domain/repositories/user.repository.interface';

@Injectable()
export class ProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(user: { id: string }) {
    console.log('Executing ProfileUseCase for user:', user);
    
    const userEntity = await this.userRepository.findById(user.id);
    if (!userEntity) {
      throw new NotFoundException('User not found');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = userEntity;
    return result;
  }
}