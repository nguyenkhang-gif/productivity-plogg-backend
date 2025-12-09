import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Budget extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Loại giao dịch: thu hoặc chi
  @Prop({
    type: String,
    enum: ['deposit', 'withdraw'], // thu / chi
    required: true,
  })
  type: 'deposit' | 'withdraw';

  // Danh mục (ăn uống, di chuyển, lương…)
  @Prop({ required: true })
  category: string;

  // Số tiền giao dịch
  @Prop({ required: true })
  amount: number;

  // Nội dung mô tả
  @Prop()
  description: string;

  // Ngày giao dịch
  @Prop({ required: true })
  date: Date;

  // Nếu bạn muốn sau này soft-delete
  @Prop({ default: false })
  isDeleted: boolean;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
