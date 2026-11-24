import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from 'src/modules/identity/user/domain/user.repository.interface';
import { RelationshipService } from 'src/modules/social';

@Injectable()
export class SearchUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly relationships: RelationshipService,
  ) {}

  async execute(query: string, excludeUserId: string) {
    if (!query || query.trim().length < 1) return [];
    const blockedIds = await this.relationships.getBlockedIds(excludeUserId);
    const users = await this.userRepository.search(
      query.trim(),
      excludeUserId,
      blockedIds,
    );
    return users.map(({ id, fullName, username, profilePic }) => ({
      id,
      fullName,
      username,
      profilePic,
    }));
  }
}
