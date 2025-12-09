import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Epub, EpubDocument } from 'src/gemini/schema/epub.schema';
import { epubI } from './interfaces/epub.interface';
import { OptionsI } from './interfaces/options.interface';
// import EpubApi from "epub-gen"
import EpubApi from 'epub-gen-memory';
import { FileUploadService } from 'src/firebase/firebase.service';
import * as Cheerio from 'cheerio';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class EpubService {
  constructor(
    @InjectModel(Epub.name) private epubModel: Model<EpubDocument>,
    private readonly supabaseService: SupabaseService,
  ) { }

  // Tạo mới một bản ghi EPUB
  async create(item: epubI): Promise<Epub> {
    const createdEpub = new this.epubModel(item);
    return createdEpub.save();
  }

  // Lấy tất cả các bản ghi EPUB
  async findAll(): Promise<Epub[]> {
    return this.epubModel.find().exec();
  }

  // Đọc nhiều bản ghi theo điều kiện
  async read(conditions: Record<string, object>): Promise<Epub[] | null> {
    return this.epubModel.find(conditions).exec();
  }

  // Cập nhật bản ghi theo ID
  async update(data: {
    _id: string;
    $set: Record<string, object>;
  }): Promise<Epub | null> {
    return this.epubModel
      .findByIdAndUpdate(data._id, { $set: data.$set }, { new: true })
      .exec();
  }

  // Xóa một bản ghi theo ID
  async delete(id: string): Promise<Epub | null> {
    return this.epubModel.findByIdAndDelete(id).exec();
  }

  // Xử lý nội dung từ HTML để tạo eBook
  async getContentFromHtml(html: string, epub: Epub) {
    return { html, epub };
  }

  // Tạo file EPUB từ dữ liệu đầu vào
  async generateEpub(options: OptionsI, userId: string): Promise<string> {
    try {
      const epubOptions = {
        title: options.title || 'Default Title',
        author: options.author || 'Unknown Author',
        content: options.content || [],
        cover: 'null',
      };

      console.log('epubOptions', epubOptions);

      // Tạo file EPUB dưới dạng buffer
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
      // Tạo đối tượng giả định `Express.Multer.File` để upload
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: `${epubOptions.title.replace(/[^a-zA-Z0-9]/g, '_')}.epub`,
        encoding: '7bit',
        mimetype: 'application/epub+zip',
        buffer: buffer,
        size: buffer.length,
        stream: null, // Không cần stream vì chúng ta đã có buffer
        destination: '',
        filename: `${epubOptions.title.replace(/[^a-zA-Z0-9]/g, '_')}.epub`,
        path: '',
      };
      console.log('Mock file:', mockFile.buffer, epubOptions);
      const bucket = process.env.SUPABASE_BUCKET_NAME; // Tên bucket đã tạo trong Supabase
      const filePath = `uploads/${userId || 'random'}/${Date.now()}-${mockFile.originalname}`;
      // const publicUrl = await this.supabaseService.uploadFile(mockFile, folder);
      const result = await this.supabaseService.uploadFile(
        bucket,
        filePath,
        mockFile.buffer,
        mockFile.mimetype,
      );

      const publicUrl = this.supabaseService.getPublicUrl(bucket, filePath);

      console.log(`File uploaded to Firebase: ${publicUrl}`);
      return publicUrl; // Trả về URL của file trên Firebase
    } catch (error) {
      console.error('Error generating and uploading EPUB:', error);
      throw error;
    }
  }

  async parseHtml(html: string, formated?: any, url?: string): Promise<any> {
    // Lấy HTML từ URL nếu không có html body
    let rawHtml = html?.length ? html : null;

    if (!rawHtml && url?.length) {
      const response = await fetch(url);
      rawHtml = await response.text();
      console.log("Fetched HTML from URL");
    }

    if (!rawHtml) {
      throw new Error("HTML input is empty. Cannot parse.");
    }

    // Load Cheerio
    const $ = Cheerio.load(rawHtml);

    // === CLEAN FUNCTIONS ===
    const cleanSelector = (selector?: string) =>
      selector?.replace(/:[a-zA-Z()-]+/g, '') ?? '';

    const cleanClass = (classStr?: string) =>
      classStr
        ? classStr
          .split(' ')
          .filter((cls) => !cls.includes(':')) // bỏ pseudo-classes
          .join('.')                           // nối với dấu .
        : '';
    console.log('formated', formated);

    // === EXTRACT FORMAT ===
    const chapterTitle = formated?.chapter_title ?? {};
    const chapterContent = formated?.chapter_content ?? {};

    // Title selector
    const tagTitle = cleanSelector(chapterTitle.tag ?? '');
    const idTitle = chapterTitle.id ? `#${chapterTitle.id}` : '';
    const classTitle = chapterTitle.class
      ? `.${cleanClass(chapterTitle.class)}`
      : '';

    // Content selector
    const tagContent = cleanSelector(chapterContent.tag ?? '');
    const idContent = chapterContent.id ? `#${chapterContent.id}` : '';
    const classContent = chapterContent.class
      ? `.${cleanClass(chapterContent.class)}`
      : '';


    // Build full selectors
    const chapterTitleSelector = `${tagTitle}${idTitle}${classTitle}`;
    const chapterContentSelector = `${tagContent}${idContent}${classContent}`;

    // === PARSE FINAL ===
    const finalChapter = {
      title: $(chapterTitleSelector).text()?.trim() || "",
      content: $(chapterContentSelector).html() || "",
    };

    console.log('finalChapter', finalChapter);

    return finalChapter;
  }
}
