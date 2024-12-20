import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PostSchema } from 'src/common/Schemas/post.schema';
import { AuthMiddleware } from 'src/common/middlewares/auth.middleware';
import { UserSchema } from 'src/common/Schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Post', schema: PostSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({
      path: 'api/post/create-post',
      method: RequestMethod.POST,
    });
  }
}
