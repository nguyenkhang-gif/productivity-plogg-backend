import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { EpubModule } from './epub/epub.module';
import { PostModule } from './post/post.module';
import { FirebaseModule } from './firebase/firebase.module';
// import { FileUploadService } from './firebase/firebase.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_DB_URI),
    AuthModule,
    UserModule,
    EpubModule,
    PostModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
