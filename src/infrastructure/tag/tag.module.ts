import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Tag,
  TagSchema,
} from 'src/infrastructure/databases/schemas/tag.schema';
import { MongoTagRepository } from 'src/infrastructure/databases/repositories/tag.repository';
import { TAG_REPOSITORY } from 'src/core/domain/repositories/tag.repository.interface';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tag.name, schema: TagSchema }])],
  providers: [{ provide: TAG_REPOSITORY, useClass: MongoTagRepository }],
  exports: [TAG_REPOSITORY],
})
export class TagModule {}
