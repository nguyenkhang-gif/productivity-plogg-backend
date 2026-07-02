import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from 'src/core/domain/repositories/user.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(POST_REPOSITORY) private readonly postRepository: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(targetId: string) {
    const user = await this.userRepository.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    const cacheKey = `user:postCount:${targetId}`;
    let postCount = await this.cache.get<number>(cacheKey);
    if (postCount === null) {
      postCount = await this.postRepository.countByAuthor(targetId);
      await this.cache.set(cacheKey, postCount, 3600);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      profilePic: user.profilePic,
      gender: user.gender,
      membership: user.membership,
      isPrivate: user.isPrivate ?? false,
      createdAt: user.createdAt,
      postCount,
    };
  }
}
