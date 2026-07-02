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
export class ProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(POST_REPOSITORY) private readonly postRepository: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(user: { id: string }) {
    const userEntity = await this.userRepository.findById(user.id);
    if (!userEntity) {
      throw new NotFoundException('User not found');
    }

    const cacheKey = `user:postCount:${user.id}`;
    let postCount = await this.cache.get<number>(cacheKey);
    if (postCount === null) {
      postCount = await this.postRepository.countByAuthor(user.id);
      await this.cache.set(cacheKey, postCount, 3600);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = userEntity;
    return { ...result, postCount };
  }
}
