import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { EpubController } from './epub.controller';
import { EpubService } from './epub.service';
import { AuthMiddleware } from 'src/common/middlewares/auth.middleware';
import { UserSchema } from 'src/common/Schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { EpubSchema } from 'src/common/Schemas/epub.schema'; // Đảm bảo EpubSchema được khai báo đúng

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), 
    MongooseModule.forFeature([{ name: 'Epub', schema: EpubSchema }]) // Đảm bảo EpubModel có trong module
  ],
  controllers: [EpubController],
  providers: [EpubService],
})
export class EpubModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //     .apply(AuthMiddleware)
  //     .forRoutes(
  //       { path: 'api/epub/getHtml', method: RequestMethod.POST }, // Đặt middleware cho endpoint POST /api/epub/getHtml
  //     );
  // }
}
