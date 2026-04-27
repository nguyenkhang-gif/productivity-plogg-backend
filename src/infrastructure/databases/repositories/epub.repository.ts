import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EpubRepository } from 'src/core/domain/repositories/epub.repository.interface';
import { Epub, EpubDocument } from '../schemas/epub.schema';
import { Model } from 'mongoose';
import { Epub as EpubEntity } from 'src/core/domain/entities/epub.entity';

@Injectable()
export class MongoEpubRepository implements EpubRepository {
  constructor(
    @InjectModel(Epub.name) private readonly epubModel: Model<EpubDocument>,
  ) {}

  private mapToDomain(epubDoc: EpubDocument): EpubEntity {
    return new EpubEntity({
      id: epubDoc._id.toString(),
      sampleUrl: epubDoc.sampleUrl,
      createdUserId: epubDoc.createdUserId,
      properties: epubDoc.properties,
      createdAt: (epubDoc as any).createdAt,
      updatedAt: (epubDoc as any).updatedAt,
    });
  }

  async findById(id: string): Promise<EpubEntity | null> {
    const epubDoc = await this.epubModel.findById(id).exec();
    return epubDoc ? this.mapToDomain(epubDoc) : null;
  }

  async create(epub: EpubEntity): Promise<EpubEntity> {
    const createdEpub = new this.epubModel({
      sampleUrl: epub.sampleUrl,
      createdUserId: epub.createdUserId,
      properties: epub.properties,
    });
    const savedEpub = await createdEpub.save();
    return this.mapToDomain(savedEpub);
  }

  async update(id: string, epubUpdate: Partial<EpubEntity>): Promise<EpubEntity> {
    const updatedEpub = await this.epubModel
      .findByIdAndUpdate(id, epubUpdate, { new: true })
      .exec();
    if (!updatedEpub) throw new Error('Epub not found');
    return this.mapToDomain(updatedEpub);
  }
}
