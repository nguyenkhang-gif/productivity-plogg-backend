import { Module } from '@nestjs/common';
import { EpubService } from './epub.service';
import { EpubController } from './epub.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Epub, Epubs } from 'src/gemini/schema/epub.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Epub.name, schema: Epubs }])],
  providers: [EpubService],
  controllers: [EpubController],
})
export class EpubModule {}
