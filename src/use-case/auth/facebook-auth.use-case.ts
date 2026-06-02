import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/core/domain/repositories/user.repository.interface';
import { User } from 'src/core/domain/entities/user.entity';

interface FacebookProfile {
  facebookId: string;
  email?: string;
  fullName: string;
  profilePic?: string;
}

@Injectable()
export class FacebookAuthUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(profile: FacebookProfile): Promise<User> {
    let user = await this.userRepository.findByFacebookId(profile.facebookId);
    if (user) return user;

    if (profile.email) {
      user = await this.userRepository.findByEmail(profile.email);
      if (user) {
        return this.userRepository.update(user.id, { facebookId: profile.facebookId });
      }
    }

    const username = await this.generateUsername(profile.fullName);
    const newUser = new User({
      fullName: profile.fullName,
      username,
      email: profile.email ?? `fb_${profile.facebookId}@placeholder.local`,
      passwordHash: '',
      gender: 'other',
      profilePic: profile.profilePic,
      facebookId: profile.facebookId,
    });
    return this.userRepository.create(newUser);
  }

  private async generateUsername(fullName: string): Promise<string> {
    const base = fullName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}_${suffix}`;
  }
}
