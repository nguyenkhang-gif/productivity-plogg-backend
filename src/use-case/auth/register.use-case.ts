import { Injectable, Inject, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { USER_REPOSITORY } from '../../core/domain/repositories/user.repository.interface';
import type { UserRepository } from '../../core/domain/repositories/user.repository.interface';
import { RegisterDto } from '../../core/dtos/register.dto';
import { User } from '../../core/domain/entities/user.entity';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const existingEmail = await this.userRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingUsername = await this.userRepository.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already in use');
    }

    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltOrRounds);

    const newUser = new User({
      fullName: dto.fullName,
      username: dto.username,
      email: dto.email,
      passwordHash,
      gender: dto.gender,
      profilePic: dto.profilePic,
    });

    const user = await this.userRepository.create(newUser);
    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }
}
