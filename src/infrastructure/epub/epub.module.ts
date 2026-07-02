import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Epub,
  EpubSchema,
} from 'src/infrastructure/databases/schemas/epub.schema';
import { MongoEpubRepository } from 'src/infrastructure/databases/repositories/epub.repository';
import { EPUB_REPOSITORY } from 'src/core/domain/repositories/epub.repository.interface';
import { EpubService } from './epub.service';
import { EpubController } from 'src/presentation/controllers/epub.controller';

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
