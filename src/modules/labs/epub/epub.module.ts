import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Epub,
  EpubSchema,
} from 'src/modules/labs/epub/infrastructure/epub.schema';
import { MongoEpubRepository } from 'src/modules/labs/epub/infrastructure/epub.repository';
import { EPUB_REPOSITORY } from 'src/modules/labs/epub/domain/epub.repository.interface';
import { EpubService } from './infrastructure/epub.service';
import { EpubController } from 'src/modules/labs/epub/presentation/epub.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Epub.name, schema: EpubSchema }]),
  ],
  providers: [
    EpubService,
    { provide: EPUB_REPOSITORY, useClass: MongoEpubRepository },
  ],
  controllers: [EpubController],
  exports: [EpubService],
})
export class EpubModule {}
