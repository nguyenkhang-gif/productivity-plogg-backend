import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { POST_REPOSITORY, PostRepository } from 'src/core/domain/repositories/post.repository.interface';
import { TAG_REPOSITORY, TagRepository } from 'src/core/domain/repositories/tag.repository.interface';
import { CATEGORY_REPOSITORY, CategoryRepository } from 'src/core/domain/repositories/category.repository.interface';
import { Post } from 'src/core/domain/entities/post.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';

export interface UpdatePostInput {
  title?: string;
  content?: string;
  imageUrls?: string[];
  isPublished?: boolean;
  categoryId?: string | null;
  tagNames?: string[];
  visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
}

@Injectable()
export class UpdatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    @Inject(TAG_REPOSITORY) private readonly tagRepo: TagRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: CategoryRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(id: string, requesterId: string, input: UpdatePostInput): Promise<Post> {
    const post = await this.postRepo.findById(id, requesterId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId) throw new ForbiddenException('Not your post');

    const updateData: Partial<Post> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.imageUrls !== undefined) updateData.imageUrls = input.imageUrls;
    if (input.isPublished !== undefined) updateData.isPublished = input.isPublished;
    if (input.visibility !== undefined) updateData.visibility = input.visibility;

    // Category change
    if (input.categoryId !== undefined) {
      if (input.categoryId) {
        const category = await this.categoryRepo.findById(input.categoryId);
        if (!category) throw new NotFoundException('Category not found');
      }
      updateData.categoryId = input.categoryId;
    }

    // Tag diff
    let addedTagIds: string[] = [];
    let removedTagIds: string[] = [];
    if (input.tagNames !== undefined) {
      const newTagIds: string[] = [];
      for (const name of input.tagNames) {
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        const tag = await this.tagRepo.findOrCreate(name, slug);
        newTagIds.push(tag.id);
      }
      const oldTagIds = post.tagIds ?? [];
      addedTagIds = newTagIds.filter(id => !oldTagIds.includes(id));
      removedTagIds = oldTagIds.filter(id => !newTagIds.includes(id));
      updateData.tagIds = newTagIds;
    }

    const updated = await this.postRepo.update(id, updateData, requesterId);

    const sideEffects: Promise<any>[] = [
      this.cache.delByPattern(`post:${id}:*`),
      this.cache.delByPattern('posts:all:*'),
      this.cache.delByPattern(`posts:author:${post.authorId}:*`),
    ];

    if (addedTagIds.length) sideEffects.push(this.tagRepo.incrementPostCount(addedTagIds));
    if (removedTagIds.length) sideEffects.push(this.tagRepo.decrementPostCount(removedTagIds));

    if (input.categoryId !== undefined) {
      const oldCat = post.categoryId;
      const newCat = input.categoryId;
      if (oldCat && oldCat !== newCat) sideEffects.push(this.categoryRepo.decrementPostCount(oldCat));
      if (newCat && newCat !== oldCat) sideEffects.push(this.categoryRepo.incrementPostCount(newCat));
    }

    await Promise.all(sideEffects);
    return updated;
  }
}
