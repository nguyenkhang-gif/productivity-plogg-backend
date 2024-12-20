import { Body, Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express'; // Bổ sung import Response từ express
import { PostService } from './post.service';
import { Types, Document } from 'mongoose';
// import { IPost, IPostNew } from './interfaces/post.interface';

@Controller('api/post')
export class PostController {
  constructor(private postService: PostService) {}

  @Post('create-post')
  async createPost(
    @Res() res: Response,
    @Req() req: Request,
    @Body()
    body: {
      item: {
        imgurl?: string[];
        caption?: string;
        comments?: Types.ObjectId[];
        status?: {
          visibility: 'public' | 'private' | 'friends';
          likes: number;
        };
        properties?: Object;
      };
    },
  ) {
    try {
      const { item } = body;

      const itemToInsert = { ...item, userid: req.user._id };
      const data = await this.postService.createPost(itemToInsert);
      return res.status(HttpStatus.OK).json({
        message: 'work',
        user: req.user,
        item: item,
        data,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
