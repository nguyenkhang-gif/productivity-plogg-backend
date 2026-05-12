import { Inject, Injectable } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Post } from 'src/core/domain/entities/post.entity';

export interface CreatePostInput {
  authorId: string;
  content: string;
  imageUrls?: string[];
}

@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(input: CreatePostInput): Promise<Post> {
    const post = new Post({
      authorId: input.authorId,
      content: input.content,
      imageUrls: input.imageUrls ?? [],
      reactCount: 0,
      isPublished: true,
    });
    return this.postRepo.create(post);
  }
}
