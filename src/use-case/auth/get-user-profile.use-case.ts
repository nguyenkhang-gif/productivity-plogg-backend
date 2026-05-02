import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/core/domain/repositories/user.repository.interface';

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(targetId: string) {
    const user = await this.userRepository.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      profilePic: user.profilePic,
      gender: user.gender,
      membership: user.membership,
      isPrivate: user.isPrivate ?? false,
      createdAt: user.createdAt,
    };
  }
}
