import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Epub, EpubDocument } from 'src/infrastructure/databases/schemas/epub.schema';
import { epubI, OptionsI } from 'src/core/domain/epub.interfaces';
import EpubApi from 'epub-gen-memory';
import * as Cheerio from 'cheerio';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class EpubService {
  constructor(
    @InjectModel(Epub.name) private epubModel: Model<EpubDocument>,
    private readonly supabaseService: SupabaseService,
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

  async generateEpub(options: OptionsI, userId: string): Promise<string> {
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

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: `${epubOptions.title.replace(/[^a-zA-Z0-9]/g, '_')}.epub`,
        encoding: '7bit',
        mimetype: 'application/epub+zip',
        buffer: buffer,
        size: buffer.length,
        stream: null,
        destination: '',
        filename: `${epubOptions.title.replace(/[^a-zA-Z0-9]/g, '_')}.epub`,
        path: '',
      };

      const bucket = process.env.SUPABASE_BUCKET_NAME;
      const filePath = `uploads/${userId || 'random'}/${Date.now()}-${mockFile.originalname}`;

      await this.supabaseService.uploadFile(
        bucket,
        filePath,
        mockFile.buffer,
        mockFile.mimetype,
      );

      const publicUrl = this.supabaseService.getPublicUrl(bucket, filePath);

      console.log(`File uploaded to Supabase: ${publicUrl}`);
      return publicUrl;
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
