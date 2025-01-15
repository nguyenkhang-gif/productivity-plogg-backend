import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Epub, EpubDocument } from 'src/gemini/schema/epub.schema';
import { epubI } from './interfaces/epub.interface';
import { OptionsI } from './interfaces/options.interface';
import EpubApi from "epub-gen"

@Injectable()
export class EpubService {
  constructor(@InjectModel(Epub.name) private epubModel: Model<EpubDocument>) {}

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
      };

      const epub =  new EpubApi(epubOptions,'./book.epub');
      await epub.promise

      return `eBook generated successfully at: ${epubOptions}`;
    } catch (error) {
      throw new Error(`Failed to generate eBook: ${error.message}`);
    }
  }
}
