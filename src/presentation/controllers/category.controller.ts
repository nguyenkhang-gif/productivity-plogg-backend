import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { RolesGuard } from 'src/presentation/guards/roles.guard';
import { Roles } from 'src/presentation/decorators/roles.decorator';
import { CreateCategoryDto } from 'src/core/dtos/create-category.dto';
import { UpdateCategoryDto } from 'src/core/dtos/update-category.dto';
import { GetCategoriesUseCase } from 'src/use-case/category/get-categories.use-case';
import { CreateCategoryUseCase } from 'src/use-case/category/create-category.use-case';
import { UpdateCategoryUseCase } from 'src/use-case/category/update-category.use-case';
import { DeleteCategoryUseCase } from 'src/use-case/category/delete-category.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/categories')
export class CategoryController {
  constructor(
    private readonly getCategories: GetCategoriesUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  findAll() {
    return this.getCategories.execute();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() body: CreateCategoryDto) {
    return this.createCategory.execute(body);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.updateCategory.execute(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.deleteCategory.execute(id);
  }
}
