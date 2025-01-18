import { Module } from '@nestjs/common';
import { EpubService } from './epub.service';
import { EpubController } from './epub.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Epub, Epubs } from 'src/gemini/schema/epub.schema';
import { FileUploadService } from 'src/firebase/firebase.service';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Epub.name, schema: Epubs }]),
    FirebaseModule
  ],
  providers: [EpubService, FileUploadService],
  controllers: [EpubController],
})
export class EpubModule {}
