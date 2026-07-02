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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateBudgetTransactionDto } from 'src/core/dtos/create-budget-transaction.dto';
import { UpdateBudgetTransactionDto } from 'src/core/dtos/update-budget-transaction.dto';
import { BudgetTransactionType } from 'src/core/domain/entities/budget-category.entity';
import { ListBudgetTransactionsUseCase } from 'src/use-case/budget-transaction/list-budget-transactions.use-case';
import { GetBudgetTransactionUseCase } from 'src/use-case/budget-transaction/get-budget-transaction.use-case';
import { CreateBudgetTransactionUseCase } from 'src/use-case/budget-transaction/create-budget-transaction.use-case';
import { UpdateBudgetTransactionUseCase } from 'src/use-case/budget-transaction/update-budget-transaction.use-case';
import { DeleteBudgetTransactionUseCase } from 'src/use-case/budget-transaction/delete-budget-transaction.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/budget/transactions')
export class BudgetTransactionController {
  constructor(
    private readonly listUseCase: ListBudgetTransactionsUseCase,
    private readonly getUseCase: GetBudgetTransactionUseCase,
    private readonly createUseCase: CreateBudgetTransactionUseCase,
    private readonly updateUseCase: UpdateBudgetTransactionUseCase,
    private readonly deleteUseCase: DeleteBudgetTransactionUseCase,
  ) {}

  @Get()
  findAll(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: BudgetTransactionType,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listUseCase.execute(req.user.userId, {
      startDate,
      endDate,
      type,
      categoryId,
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.getUseCase.execute(id, req.user.userId);
  }

  @Post()
  create(@Body() dto: CreateBudgetTransactionDto, @Req() req) {
    return this.createUseCase.execute(req.user.userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetTransactionDto,
    @Req() req,
  ) {
    return this.updateUseCase.execute(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req) {
    return this.deleteUseCase.execute(id, req.user.userId);
  }
}
