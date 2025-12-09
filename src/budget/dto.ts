import {
    IsString,
    IsNumber,
    IsNotEmpty,
    IsDateString,
    IsOptional,
    IsEnum,
  } from 'class-validator';
  import { PartialType } from '@nestjs/mapped-types';
  
  export class CreateBudgetDto {
    @IsNotEmpty()
    @IsString()
    userId: string;
  
    @IsEnum(['deposit', 'withdraw'])
    type: 'deposit' | 'withdraw';
  
    @IsNotEmpty()
    @IsString()
    category: string;
  
    @IsNotEmpty()
    @IsNumber()
    amount: number;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsNotEmpty()
    @IsDateString()
    date: string;
  }
  
  export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}
  