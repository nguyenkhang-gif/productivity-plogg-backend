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

@Injectable()
export class EpubService {
  constructor(
    @InjectModel(Epub.name) private epubModel: Model<EpubDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

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
  async generateEpub(options: OptionsI): Promise<string> {
    try {
      const epubOptions = {
        title: options.title || 'Default Title',
        author: options.author || 'Unknown Author',
        content: options.content || [],
        cover: 'null',
      };

      // Tạo file EPUB dưới dạng buffer
      const buffer = await EpubApi(
        epubOptions,
        epubOptions.content.map((item) => ({
          title: item.title,
          content: item.data,
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
      // Upload file bằng FileUploadServi§ce
      const publicUrl = await this.fileUploadService.uploadFile(mockFile);
      console.log(`File uploaded to Firebase: ${publicUrl}`);
      return publicUrl; // Trả về URL của file trên Firebase
    } catch (error) {
      console.error('Error generating and uploading EPUB:', error);
      throw error;
    }
  }

  async parseHtml(html: string, formated: any, url: string): Promise<string> {
    // Sử dụng cheerio để phân tích HTML
    const content = url.length ? await fetch(url) : undefined;
    const contentText = content ? await content.text() : undefined;
    let $: Cheerio.CheerioAPI = null;
    if (contentText?.length) {
      $ = Cheerio.load(contentText);
    } else {
      $ = Cheerio.load(html);
      // console.log(html, 'html');
    }
    console.log($, 'cheerio');
    console.log($(`${formated.chapter_title.tag}`).text(), 'formated');
    const finalChapter = {
      title: $(
        `${formated.chapter_title.tag}${formated.chapter_title.id ? `#${formated.chapter_title.id}` : ''}${formated.chapter_title.class ? `.${formated.chapter_title.class.split(' ').join('.')}` : ''}`,
      ).text(),
      content: $(
        `${formated.chapter_content.tag}${formated.chapter_content.id ? `#${formated.chapter_content.id}` : ''}${formated.chapter_content.class ? `.${formated.chapter_content.class.split(' ').join('.')}` : ''}`,
      ).html(),
    };

    // console.log(finalChapter, 'finalChapter');

    return JSON.stringify(finalChapter);
  }
}
