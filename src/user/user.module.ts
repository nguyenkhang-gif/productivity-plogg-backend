import { Module, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserSchema } from '../common/Schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //     .apply(AuthMiddleware)
  //     .forRoutes(
  //       { path: 'api/user/get', method: RequestMethod.GET },
  //       { path: 'api/user/users', method: RequestMethod.GET },
  //     );
  // }
}
