import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Epub, EpubDocument } from 'src/gemini/schema/epub.schema';
import { epubI } from './interfaces/epub.interface';
import { OptionsI } from './interfaces/options.interface';
// import EpubApi from "epub-gen"
import * as path from 'path';
import * as fs from 'fs/promises';
import * as stream from 'stream';
import * as EpubApi from 'epub-gen';
import { FileUploadService } from 'src/firebase/firebase.service';

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
      };

      // Tạo thư mục tạm thời để lưu file
      const tempDir = path.resolve(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });

      // Tạo đường dẫn file EPUB
      const fileName = `${epubOptions.title.replace(/[^a-zA-Z0-9]/g, '_')}.epub`;
      const filePath = path.join(tempDir, fileName);

      // Tạo file EPUB
      const epub = new EpubApi(epubOptions, filePath);
      await epub.promise;

      console.log(`EPUB file created at: ${filePath}`);

      // Đọc file và chuẩn bị upload
      const fileBuffer = await fs.readFile(filePath);

      // Tạo đối tượng giả định `Express.Multer.File` để upload
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: 'application/epub+zip',
        buffer: fileBuffer,
        size: fileBuffer.length,
        stream: new stream.PassThrough(), // Tạo stream rỗng
        destination: '', // Không cần sử dụng nếu không ghi trực tiếp vào ổ đĩa
        filename: fileName, // Tên file
        path: '', // Đường dẫn không sử dụng vì file nằm trong buffer
      };

      // Upload file bằng FileUploadService
      const publicUrl = await this.fileUploadService.uploadFile(mockFile);

      console.log(`File uploaded to Firebase: ${publicUrl}`);

      // Xóa file tạm sau khi upload
      await fs.unlink(filePath);
      console.log(`Temporary file deleted: ${filePath}`);

      return publicUrl; // Trả về URL của file trên Firebase
    } catch (error) {
      console.error('Error generating and uploading EPUB:', error);
      throw error;
    }
  }
}
