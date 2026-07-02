import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from 'src/core/domain/repositories/user.repository.interface';
import { User } from 'src/core/domain/entities/user.entity';

interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
  profilePic?: string;
}

@Injectable()
export class GoogleAuthUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(profile: GoogleProfile): Promise<User> {
    let user = await this.userRepository.findByGoogleId(profile.googleId);
    if (user) return user;

    user = await this.userRepository.findByEmail(profile.email);
    if (user) {
      return this.userRepository.update(user.id, {
        googleId: profile.googleId,
      });
    }

    const username = await this.generateUsername(profile.fullName);
    const newUser = new User({
      fullName: profile.fullName,
      username,
      email: profile.email,
      passwordHash: '',
      gender: 'other',
      profilePic: profile.profilePic,
      googleId: profile.googleId,
    });
    return this.userRepository.create(newUser);
  }

  private async generateUsername(fullName: string): Promise<string> {
    const base = fullName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}_${suffix}`;
  }
}
