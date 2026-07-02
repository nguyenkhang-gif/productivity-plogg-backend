import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateBudgetCategoryDto } from 'src/core/dtos/create-budget-category.dto';
import { UpdateBudgetCategoryDto } from 'src/core/dtos/update-budget-category.dto';
import { ListBudgetCategoriesUseCase } from 'src/use-case/budget-category/list-budget-categories.use-case';
import { CreateBudgetCategoryUseCase } from 'src/use-case/budget-category/create-budget-category.use-case';
import { UpdateBudgetCategoryUseCase } from 'src/use-case/budget-category/update-budget-category.use-case';
import { ArchiveBudgetCategoryUseCase } from 'src/use-case/budget-category/archive-budget-category.use-case';

@Controller('api/budget/categories')
export class BudgetCategoryController {
  constructor(
    private readonly listUseCase: ListBudgetCategoriesUseCase,
    private readonly createUseCase: CreateBudgetCategoryUseCase,
    private readonly updateUseCase: UpdateBudgetCategoryUseCase,
    private readonly archiveUseCase: ArchiveBudgetCategoryUseCase,
  ) {}

  @Get()
  findAll(@Query('includeArchived') includeArchived?: string) {
    return this.listUseCase.execute(includeArchived === 'true');
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateBudgetCategoryDto, @Req() req) {
    return this.createUseCase.execute(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetCategoryDto,
    @Req() req,
  ) {
    return this.updateUseCase.execute(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  archive(@Param('id') id: string, @Req() req) {
    return this.archiveUseCase.execute(id, req.user.userId);
  }
}
