import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Model } from 'mongoose';
import { ChapterData } from 'src/firebase/interface/chapter.interface';
import { IEpub } from './interfaces/epub.interface';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateResult } from 'mongodb';

@Injectable()
export class EpubService {
  constructor(@InjectModel('Epub') private readonly epubModel: Model<IEpub>) {}

  async createEpub(createEpubI: IEpub): Promise<IEpub> {
    // Đảm bảo `userId` không bị thiếu

    const userId = createEpubI.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required to create an epub');
    }

    // Kết hợp userId với dữ liệu từ DTO
    const epubData = {
      ...createEpubI,
    };

    const newEpub = new this.epubModel(epubData);

    // Lưu vào database
    return await newEpub.save();
  }

  async updateObject(data: any, userId: string): Promise<UpdateResult | null> {
    const { _id, $set } = data.data;
    console.log(data, _id, 'data');

    if (!_id) {
      throw new BadRequestException('ID must be provided for update');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required to update an epub');
    }

    // Lấy item từ cơ sở dữ liệu để kiểm tra quyền truy cập
    const item = await this.epubModel.findById(_id).exec();

    // Kiểm tra quyền truy cập
    if (!item) {
      throw new BadRequestException('No document found with the provided ID');
    }

    if (item.userId.toString() !== userId) {
      throw new ForbiddenException(
        'User does not have permission to edit this EPUB',
      );
    }

    const updateData = {
      $set: { ...$set },
    };

    const result = await this.epubModel
      .updateOne({ _id }, updateData, { new: true })
      .exec();

    if (result.matchedCount === 0) {
      throw new BadRequestException('No document found with the provided ID');
    }

    return result;
  }

  async fetchHtml(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      throw new Error('Failed to fetch HTML: ' + err.message);
    }
  }

  parseMainPage(html: string) {
    try {
      const $ = cheerio.load(html);
      const title = $('.volume-list');
      const mainTitle = $('.series-name a');
      const dataArray = [];

      console.log(title.length, 'lenght');

      title.each((index, element) => {
        const Child = $(element).find('.chapter-name');
        Child.each((childIndex, childElement) => {
          // Tìm thẻ <a> bên trong .chapter-name
          const linkElement = $(childElement).find('a');

          // Lấy thuộc tính href và title từ thẻ <a>
          const href = linkElement.attr('href');
          const title = linkElement.attr('title');
          dataArray.push({
            href: href,
            title: title,
          });
        });
      });
      return {
        mainTitle: mainTitle.text().trim(),
        allChapters: dataArray,
      };
    } catch (err) {
      console.log('Failed to parse HTML', err);
      return { id: 0, title: 'not found', data: 'string | null;' };
    }
  }

  parseChapter(html: string, chaptersCount: number): ChapterData {
    try {
      const $ = cheerio.load(html);
      const chapterContent = $('.reading-content');
      const titleText = chapterContent.find('h4').text();
      chapterContent.find('#chapter-content div').remove();
      chapterContent.find('#chapter-content a').remove();
      const contentText = chapterContent.find('#chapter-content').html();

      return {
        id: chaptersCount + 1,
        title: titleText.trim(),
        data: contentText?.trim() || null,
      };
    } catch (err) {
      console.error('Failed to parse HTML', err);
      return { id: 0, title: 'not found', data: 'string | null;' };
    }
  }

  async generateAndUploadEpub(
    lightnovelInfo: { title: string; author: string },
    chapters: ChapterData[],
  ): Promise<string> {
    // const epubChapters = chapters.map((chapter) => ({
    //   title: chapter.title,
    //   data: chapter.data,
    // }));

    // const options = {
    //   title: lightnovelInfo.title,
    //   author: lightnovelInfo.author,
    //   content: epubChapters,
    // };

    try {
      // Generate the EPUB file
      // await new Epub(options, outputPath).promise;

      return '';
    } catch (err) {
      console.log(err);
      throw new Error('Error generating or uploading EPUB from bucket ???');
    }
  }
}
