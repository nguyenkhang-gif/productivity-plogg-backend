import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Epub,
  EpubSchema,
} from 'src/modules/labs/epub/infrastructure/epub.schema';
import { MongoEpubRepository } from 'src/modules/labs/epub/infrastructure/epub.repository';
import { PrismaEpubRepository } from 'src/modules/labs/epub/infrastructure/epub.prisma.repository';
import {
  EPUB_REPOSITORY,
  type EpubRepository,
} from 'src/modules/labs/epub/domain/epub.repository.interface';
import { EpubService } from './infrastructure/epub.service';
import { EpubController } from 'src/modules/labs/epub/presentation/epub.controller';
import { PrismaModule } from 'src/shared/database/prisma.module';
import { backendProvider } from 'src/shared/database/backend-provider';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([{ name: Epub.name, schema: EpubSchema }]),
  ],
  providers: [
    EpubService,
    MongoEpubRepository,
    PrismaEpubRepository,
    backendProvider<EpubRepository>(
      EPUB_REPOSITORY,
      MongoEpubRepository,
      PrismaEpubRepository,
    ),
  ],
  controllers: [EpubController],
  exports: [EpubService],
})
export class EpubModule {}
