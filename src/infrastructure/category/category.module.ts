import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from 'src/infrastructure/databases/schemas/category.schema';
import { MongoCategoryRepository } from 'src/infrastructure/databases/repositories/category.repository';
import { CATEGORY_REPOSITORY } from 'src/core/domain/repositories/category.repository.interface';

@Module({
  imports: [MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])],
  providers: [{ provide: CATEGORY_REPOSITORY, useClass: MongoCategoryRepository }],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoryModule {}
