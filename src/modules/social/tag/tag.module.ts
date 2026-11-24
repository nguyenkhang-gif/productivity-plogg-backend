import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Tag,
  TagSchema,
} from 'src/modules/social/tag/infrastructure/tag.schema';
import { MongoTagRepository } from 'src/modules/social/tag/infrastructure/tag.repository';
import { TAG_REPOSITORY } from 'src/modules/social/tag/domain/tag.repository.interface';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tag.name, schema: TagSchema }])],
  providers: [{ provide: TAG_REPOSITORY, useClass: MongoTagRepository }],
  exports: [TAG_REPOSITORY],
})
export class TagModule {}
