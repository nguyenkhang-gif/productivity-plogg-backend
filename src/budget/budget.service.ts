import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget } from './budget.schema';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<Budget>,
  ) {}

  async create(dto: CreateBudgetDto): Promise<Budget> {
    const budget = new this.budgetModel(dto);
    return budget.save();
  }

  async findAll(): Promise<Budget[]> {
    return this.budgetModel.find().populate('tasks').exec();
  }

  async findOne(id: string): Promise<Budget> {
    const budget = await this.budgetModel.findById(id).populate('tasks').exec();
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async update(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    const updated = await this.budgetModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Budget not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.budgetModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Budget not found');
  }

  // async addSpent(id: string, amount: number): Promise<Budget> {
  //   const budget = await this.budgetModel.findById(id);
  //   if (!budget) throw new NotFoundException('Budget not found');

  //   budget.spentAmount += amount;
  //   return budget.save();
  // }

  // ⭐ Hàm aggregate linh hoạt
  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.budgetModel.aggregate(pipeline).exec();
  }
}
