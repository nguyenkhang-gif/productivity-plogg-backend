import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Epub, EpubDocument } from 'src/infrastructure/databases/schemas/epub.schema';
import { epubI, OptionsI } from 'src/core/domain/epub.interfaces';
import EpubApi from 'epub-gen-memory';
import * as Cheerio from 'cheerio';
@Injectable()
export class EpubService {
  constructor(
    @InjectModel(Epub.name) private epubModel: Model<EpubDocument>,
  ) { }

  async create(item: epubI): Promise<Epub> {
    const createdEpub = new this.epubModel(item);
    return createdEpub.save();
  }

  async findAll(): Promise<Epub[]> {
    return this.epubModel.find().exec();
  }

  async read(conditions: Record<string, object>): Promise<Epub[] | null> {
    return this.epubModel.find(conditions).exec();
  }

  async findOne(id: string, userId?: string): Promise<Epub | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID');
    }
    const query: Record<string, any> = { _id: id };
    if (userId) {
      query.createdUserId = userId;
    }
    const epub = await this.epubModel.findOne(query).exec();
    if (!epub) {
      throw new NotFoundException('Epub not found');
    }
    return epub;
  }

  async update(
    id: string,
    updateData: Partial<Epub>,
    userId?: string,
  ): Promise<Epub | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID');
    }
    const query: Record<string, any> = { _id: id };
    if (userId) {
      query.createdUserId = userId;
    }
    const epub = await this.epubModel
      .findOneAndUpdate(query, { $set: updateData }, { new: true })
      .exec();
    if (!epub) {
      throw new NotFoundException('Epub not found or you do not have permission to update it');
    }
    return epub;
  }

  async delete(id: string, userId?: string): Promise<Epub | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID');
    }
    const query: Record<string, any> = { _id: id };
    if (userId) {
      query.createdUserId = userId;
    }
    const epub = await this.epubModel.findOneAndDelete(query).exec();
    if (!epub) {
      throw new NotFoundException('Epub not found or you do not have permission to delete it');
    }
    return epub;
  }

  async generateEpub(options: OptionsI, userId: string): Promise<Buffer> {
    try {
      const epubOptions = {
        title: options.title || 'Default Title',
        author: options.author || 'Unknown Author',
        content: options.content || [],
        cover: 'null',
      };

      console.log('epubOptions', epubOptions);

      const buffer = await EpubApi(
        epubOptions,
        epubOptions.content.map((item) => ({
          title: item.title,
          content: item.data.replace(
            /<[^>]*\ssrc=["'][^"']*["'][^>]*>.*?<\/[^>]+>|<[^>]*\ssrc=["'][^"']*["'][^>]*\/?>/gs,
            '',
          ),
        })),
      );

      return buffer;
    } catch (error) {
      console.error('Error generating and uploading EPUB:', error);
      throw error;
    }
  }

  async parseHtml(html: string, formated?: any, url?: string): Promise<any> {
    let rawHtml = html?.length ? html : null;

    if (!rawHtml && url?.length) {
      const response = await fetch(url);
      rawHtml = await response.text();
    }

    if (!rawHtml) {
      throw new Error('HTML input is empty. Cannot parse.');
    }

    const $ = Cheerio.load(rawHtml);

    const cleanSelector = (selector?: string) =>
      selector?.replace(/:[a-zA-Z()-]+/g, '') ?? '';

    const cleanClass = (classStr?: string) =>
      classStr
        ? classStr
          .split(' ')
          .filter((cls) => !cls.includes(':'))
          .join('.')
        : '';

    const chapterTitle = formated?.chapter_title ?? {};
    const chapterContent = formated?.chapter_content ?? {};

    const tagTitle = cleanSelector(chapterTitle.tag ?? '');
    const idTitle = chapterTitle.id ? `#${chapterTitle.id}` : '';
    const classTitle = chapterTitle.class
      ? `.${cleanClass(chapterTitle.class)}`
      : '';

    const tagContent = cleanSelector(chapterContent.tag ?? '');
    const idContent = chapterContent.id ? `#${chapterContent.id}` : '';
    const classContent = chapterContent.class
      ? `.${cleanClass(chapterContent.class)}`
      : '';

    const chapterTitleSelector = `${tagTitle}${idTitle}${classTitle}`;
    const chapterContentSelector = `${tagContent}${idContent}${classContent}`;

    const finalChapter = {
      title: $(chapterTitleSelector).text()?.trim() || '',
      content: $(chapterContentSelector).html() || '',
    };

    return finalChapter;
  }
}
