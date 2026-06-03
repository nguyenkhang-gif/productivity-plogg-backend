import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Epub, EpubDocument } from 'src/infrastructure/databases/schemas/epub.schema';
import { epubI } from 'src/core/domain/epub.interfaces';

@Injectable()
export class EpubService {
  constructor(
    @InjectModel(Epub.name) private epubModel: Model<EpubDocument>,
  ) {}

  async create(item: epubI): Promise<Epub> {
    return new this.epubModel(item).save();
  }

  async read(conditions: Record<string, any>): Promise<Epub[]> {
    return this.epubModel.find(conditions).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<Epub> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    const epub = await this.epubModel.findOne({ _id: id, createdUserId: userId }).exec();
    if (!epub) throw new NotFoundException('Epub not found');
    return epub;
  }

  async update(id: string, updateData: Partial<Epub>, userId: string): Promise<Epub> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    const epub = await this.epubModel
      .findOneAndUpdate({ _id: id, createdUserId: userId }, { $set: updateData }, { new: true })
      .exec();
    if (!epub) throw new NotFoundException('Epub not found or no permission');
    return epub;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    const result = await this.epubModel.findOneAndDelete({ _id: id, createdUserId: userId }).exec();
    if (!result) throw new NotFoundException('Epub not found or no permission');
  }
}
