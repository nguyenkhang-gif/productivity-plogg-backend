import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { PaginationResponse } from './interfaces/pagination-response.interface';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {}

  async create(data: Partial<Post>): Promise<PostDocument> {
    return this.postModel.create(data);
  }

  /**
   * Get feed (pagination)
   * ✅ FIX TS7056 ở đây
   */
  async findAll(
    page = 1,
    limit = 10,
  ): Promise<PaginationResponse<any>> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.postModel
        .find({ isPublished: true })
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.postModel.countDocuments({ isPublished: true }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Post not found');
    }

    const post = await this.postModel
      .findById(id)
      .populate('userId', 'name avatar')
      .populate('comments.userId', 'name avatar');

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(
    id: string,
    data: Partial<Post>,
  ): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Post not found');
    }

    const post = await this.postModel.findByIdAndUpdate(
      id,
      data,
      { new: true },
    );

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Post not found');
    }

    const post = await this.postModel.findByIdAndDelete(id);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return { message: 'Post deleted successfully' };
  }
}
