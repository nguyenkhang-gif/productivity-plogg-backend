import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/core/domain/repositories/user.repository.interface';

@Injectable()
export class SearchUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(query: string, excludeUserId: string) {
    if (!query || query.trim().length < 1) return [];
    const users = await this.userRepository.search(query.trim(), excludeUserId);
    return users.map(({ id, fullName, username, profilePic }) => ({
      id,
      fullName,
      username,
      profilePic,
    }));
  }
}
