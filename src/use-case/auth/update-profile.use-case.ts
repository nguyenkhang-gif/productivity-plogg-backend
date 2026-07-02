import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from 'src/core/domain/repositories/user.repository.interface';
import { UpdateProfileDto } from 'src/core/dtos/update-profile.dto';
import { User } from 'src/core/domain/entities/user.entity';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash' | 'resetPasswordToken'>> {
    if (dto.username) {
      const existing = await this.userRepository.findByUsername(dto.username);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
    }

    const updated = await this.userRepository.update(userId, dto);

    const {
      passwordHash: _passwordHash,
      resetPasswordToken: _resetPasswordToken,
      ...safe
    } = updated;
    return safe;
  }
}
