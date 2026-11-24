import { Injectable, Inject, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { USER_REPOSITORY } from '../../user/domain/user.repository.interface';
import type { UserRepository } from '../../user/domain/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { User } from '../../user/domain/user.entity';

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

    const saltOrRounds = 12;
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
