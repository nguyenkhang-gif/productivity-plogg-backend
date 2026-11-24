import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Tag,
  TagSchema,
} from 'src/modules/social/tag/infrastructure/tag.schema';
import { MongoTagRepository } from 'src/modules/social/tag/infrastructure/tag.repository';
import { PrismaTagRepository } from 'src/modules/social/tag/infrastructure/tag.prisma.repository';
import { backendProvider } from 'src/shared/database/backend-provider';
import { PrismaModule } from 'src/shared/database/prisma.module';
import type { TagRepository } from 'src/modules/social/tag/domain/tag.repository.interface';
import { TAG_REPOSITORY } from 'src/modules/social/tag/domain/tag.repository.interface';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([{ name: Tag.name, schema: TagSchema }]),
  ],
  providers: [
    MongoTagRepository,
    PrismaTagRepository,
    backendProvider<TagRepository>(
      TAG_REPOSITORY,
      MongoTagRepository,
      PrismaTagRepository,
    ),
  ],
  exports: [TAG_REPOSITORY],
})
export class TagModule {}
