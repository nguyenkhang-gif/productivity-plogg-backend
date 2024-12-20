// post.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPost } from './interfaces/post.interface';

@Injectable()
export class PostService {
  constructor(@InjectModel('Post') private readonly postModel: Model<IPost>) {}

  // Phương thức tạo bài viết
  async createPost(postData: IPost): Promise<IPost> {
    const createdPost = new this.postModel(postData); // Tạo instance mới từ model
    return createdPost.save(); // Lưu bài viết vào MongoDB
  }
}
