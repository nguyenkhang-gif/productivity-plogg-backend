import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EpubRepository } from 'src/modules/labs/epub/domain/epub.repository.interface';
import { Epub, EpubDocument } from './epub.schema';
import { Model } from 'mongoose';
import { Epub as EpubEntity } from 'src/modules/labs/epub/domain/epub.entity';

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

  async update(
    id: string,
    epubUpdate: Partial<EpubEntity>,
  ): Promise<EpubEntity> {
    const updatedEpub = await this.epubModel
      .findByIdAndUpdate(id, epubUpdate, { new: true })
      .exec();
    if (!updatedEpub) throw new Error('Epub not found');
    return this.mapToDomain(updatedEpub);
  }

  async findAllByUser(userId: string): Promise<EpubEntity[]> {
    const docs = await this.epubModel
      .find({ createdUserId: userId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<EpubEntity | null> {
    const doc = await this.epubModel
      .findOne({ _id: id, createdUserId: userId })
      .exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async updateForUser(
    id: string,
    userId: string,
    data: Partial<Pick<EpubEntity, 'sampleUrl' | 'properties'>>,
  ): Promise<EpubEntity | null> {
    const doc = await this.epubModel
      .findOneAndUpdate(
        { _id: id, createdUserId: userId },
        { $set: data },
        { new: true },
      )
      .exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const doc = await this.epubModel
      .findOneAndDelete({ _id: id, createdUserId: userId })
      .exec();
    return doc !== null;
  }
}
