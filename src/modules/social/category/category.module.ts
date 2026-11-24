import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Category,
  CategorySchema,
} from 'src/modules/social/category/infrastructure/category.schema';
import { MongoCategoryRepository } from 'src/modules/social/category/infrastructure/category.repository';
import { PrismaCategoryRepository } from 'src/modules/social/category/infrastructure/category.prisma.repository';
import { backendProvider } from 'src/shared/database/backend-provider';
import { PrismaModule } from 'src/shared/database/prisma.module';
import type { CategoryRepository } from 'src/modules/social/category/domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from 'src/modules/social/category/domain/category.repository.interface';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  providers: [
    MongoCategoryRepository,
    PrismaCategoryRepository,
    backendProvider<CategoryRepository>(
      CATEGORY_REPOSITORY,
      MongoCategoryRepository,
      PrismaCategoryRepository,
    ),
  ],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoryModule {}
