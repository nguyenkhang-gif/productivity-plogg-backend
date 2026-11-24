import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Category,
  CategorySchema,
} from 'src/modules/social/category/infrastructure/category.schema';
import { MongoCategoryRepository } from 'src/modules/social/category/infrastructure/category.repository';
import { CATEGORY_REPOSITORY } from 'src/modules/social/category/domain/category.repository.interface';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  providers: [
    { provide: CATEGORY_REPOSITORY, useClass: MongoCategoryRepository },
  ],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoryModule {}
