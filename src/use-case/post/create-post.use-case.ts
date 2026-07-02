import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import {
  TAG_REPOSITORY,
  TagRepository,
} from 'src/core/domain/repositories/tag.repository.interface';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from 'src/core/domain/repositories/category.repository.interface';
import {
  Post,
  deriveModerationStatus,
} from 'src/core/domain/entities/post.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';

export interface CreatePostInput {
  authorId: string;
  title?: string;
  content: string;
  imageUrls?: string[];
  categoryId?: string | null;
  tagNames?: string[];
  visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
}

@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    @Inject(TAG_REPOSITORY) private readonly tagRepo: TagRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: CategoryRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(input: CreatePostInput): Promise<Post> {
    if (input.categoryId) {
      const category = await this.categoryRepo.findById(input.categoryId);
      if (!category) throw new NotFoundException('Category not found');
    }

    const tagIds: string[] = [];
    if (input.tagNames?.length) {
      for (const name of input.tagNames) {
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        const tag = await this.tagRepo.findOrCreate(name, slug);
        tagIds.push(tag.id);
      }
    }

    const visibility = input.visibility ?? 'PUBLIC';
    const post = new Post({
      authorId: input.authorId,
      title: input.title,
      content: input.content,
      imageUrls: input.imageUrls ?? [],
      categoryId: input.categoryId ?? null,
      tagIds,
      reactCount: 0,
      isPublished: true,
      visibility,
      moderationStatus: deriveModerationStatus(visibility),
    });

    const created = await this.postRepo.create(post);

    await Promise.all([
      input.categoryId
        ? this.categoryRepo.incrementPostCount(input.categoryId)
        : Promise.resolve(),
      tagIds.length
        ? this.tagRepo.incrementPostCount(tagIds)
        : Promise.resolve(),
      this.cache.delByPattern('posts:all:*'),
      this.cache.delByPattern(`posts:author:${input.authorId}:*`),
      this.cache.del(`user:postCount:${input.authorId}`),
    ]);

    return created;
  }
}
