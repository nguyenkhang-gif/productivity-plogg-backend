import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryRepository } from 'src/core/domain/repositories/category.repository.interface';
import { Category as CategoryEntity } from 'src/core/domain/entities/category.entity';
import { Category, CategoryDocument } from '../schemas/category.schema';

@Injectable()
export class MongoCategoryRepository implements CategoryRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  private mapToDomain(doc: any): CategoryEntity {
    return new CategoryEntity({
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      postCount: doc.postCount ?? 0,
      createdAt: doc.createdAt,
    });
  }

  async findAll(): Promise<CategoryEntity[]> {
    const docs = await this.categoryModel.find().sort({ name: 1 }).lean();
    return docs.map((d) => this.mapToDomain(d));
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const doc = await this.categoryModel.findById(id).lean();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const doc = await this.categoryModel.findOne({ slug }).lean();
    return doc ? this.mapToDomain(doc) : null;
  }

  async create(data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    try {
      const doc = await this.categoryModel.create({ ...data, postCount: 0 });
      return this.mapToDomain(doc);
    } catch (err: any) {
      if (err.code === 11000)
        throw new ConflictException('Category slug already exists');
      throw err;
    }
  }

  async update(
    id: string,
    data: Partial<CategoryEntity>,
  ): Promise<CategoryEntity> {
    try {
      const doc = await this.categoryModel
        .findByIdAndUpdate(id, data, { new: true })
        .lean();
      if (!doc) throw new NotFoundException('Category not found');
      return this.mapToDomain(doc);
    } catch (err: any) {
      if (err.code === 11000)
        throw new ConflictException('Category slug already exists');
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Category not found');
  }

  async incrementPostCount(id: string): Promise<void> {
    await this.categoryModel.findByIdAndUpdate(id, { $inc: { postCount: 1 } });
  }

  async decrementPostCount(id: string): Promise<void> {
    await this.categoryModel.findOneAndUpdate(
      { _id: id, postCount: { $gt: 0 } },
      { $inc: { postCount: -1 } },
    );
  }
}
