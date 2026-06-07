import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TagRepository } from 'src/core/domain/repositories/tag.repository.interface';
import { Tag as TagEntity } from 'src/core/domain/entities/tag.entity';
import { Tag, TagDocument } from '../schemas/tag.schema';

@Injectable()
export class MongoTagRepository implements TagRepository {
  constructor(@InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>) {}

  private mapToDomain(doc: any): TagEntity {
    return new TagEntity({
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      postCount: doc.postCount ?? 0,
      createdAt: doc.createdAt,
    });
  }

  async findOrCreate(name: string, slug: string): Promise<TagEntity> {
    const doc = await this.tagModel.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug, postCount: 0 } },
      { upsert: true, new: true },
    );
    return this.mapToDomain(doc);
  }

  async findBySlugSearch(search: string, limit: number): Promise<TagEntity[]> {
    const docs = await this.tagModel
      .find({ slug: { $regex: search.toLowerCase(), $options: 'i' } })
      .sort({ postCount: -1 })
      .limit(limit)
      .lean();
    return docs.map((d) => this.mapToDomain(d));
  }

  async findTrending(limit: number): Promise<TagEntity[]> {
    const docs = await this.tagModel
      .find({ postCount: { $gt: 0 } })
      .sort({ postCount: -1 })
      .limit(limit)
      .lean();
    return docs.map((d) => this.mapToDomain(d));
  }

  async findByIds(ids: string[]): Promise<TagEntity[]> {
    const docs = await this.tagModel
      .find({ _id: { $in: ids } })
      .lean();
    return docs.map((d) => this.mapToDomain(d));
  }

  async incrementPostCount(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.tagModel.updateMany({ _id: { $in: ids } }, { $inc: { postCount: 1 } });
  }

  async decrementPostCount(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.tagModel.updateMany(
      { _id: { $in: ids }, postCount: { $gt: 0 } },
      { $inc: { postCount: -1 } },
    );
  }
}
