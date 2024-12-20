import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EpubService } from './epub.service';
import { ChapterData } from 'src/firebase/interface/chapter.interface';
import { CreateEpubDto } from './dtos/create-epub.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';

@Controller('api/epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}

  @Post('getHtml')
  async getHtml(@Body('item') item: { url: string }, @Res() res, @Req() req) {
    const { user } = req;
    if (
      user.role == 'admin' ||
      user.membership == 'advance' ||
      user.membership == 'vip'
    ) {
      try {
        const data = await this.epubService.fetchHtml(item.url);
        res.send(data);
      } catch (err) {
        res.status(500).json({ Error: 'wrong URL or server error' });
      }
    } else {
      throw new UnauthorizedException('You need to have a member ship to use ');
    }
  }

  @Post('parseChapter')
  async parseChapter(@Body('item') item: { url: string }, @Res() res) {
    try {
      const html = await this.epubService.fetchHtml(item.url);
      console.log(html);
      const chapterData = this.epubService.parseChapter(html, 1); // Adjust chapter count as needed
      return res.send(chapterData);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to parse chapter' });
    }
  }

  @Post('gen-all-page-info')
  async genAllPageinfo(@Body('item') item: { url: string }, @Res() res) {
    try {
      const html = await this.epubService.fetchHtml(item.url);
      const response = this.epubService.parseMainPage(html);
      // console.log(response)
      return res.send(response);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Failed to parse chapter' });
    }
  }

  @Post('generateEpub')
  async generateEpub(
    @Body()
    body: {
      lightnovelInfo: { title: string; author: string };
      chapters: ChapterData[];
    },
    @Res() res: Response,
  ) {
    try {
      const { lightnovelInfo, chapters } = body;
      const downloadUrl = await this.epubService.generateAndUploadEpub(
        lightnovelInfo,
        chapters,
      );
      res.status(200).json({ downloadUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error generating or uploading EPUB' });
    }
  }

  @Post('generate-epub-from-url')
  async generateEpubFromUrl(
    @Body('item') item: { url: string },
    @Res() res: Response,
  ) {
    try {
      const html = await this.epubService.fetchHtml(item.url);
      console.log(html);
      const chapterData = this.epubService.parseChapter(html, 1);
      console.log(chapterData);

      const chapters = [chapterData];
      const lightnovelInfo = { title: 'test', author: 'test author' };
      const downloadUrl = await this.epubService.generateAndUploadEpub(
        lightnovelInfo,
        chapters,
      );
      console.log('url', downloadUrl);
      res.status(200).json({ downloadUrl });
    } catch (err) {
      console.log(err, 'err');
      res.status(500).json({ error: 'Error generating or uploading EPUB 111' });
    }
  }

  @Post('generate-epub-from-list')
  async genEpubFromList(
    @Body('item')
    item: {
      mainTitle: string;
      allChapters: { href: string; title: string }[];
    },
  ) {
    try {
      // Đảm bảo rằng item.urls là một mảng
      if (!Array.isArray(item.allChapters)) {
        throw new Error('urls must be an array');
      }

      // Duyệt qua mảng urls và xử lý từng phần tử
      const allHtml = await Promise.all(
        item.allChapters.map(async (urlItem, index) => {
          const url = urlItem.href;
          // const title = urlItem.title;
          // Giả sử bạn có một hàm để fetch HTML từ URL
          const html = await this.epubService.fetchHtml(
            `https://docln.net${url}`,
          );
          const chapterData = this.epubService.parseChapter(html, index + 1);
          return { chapterData };
        }),
      );

      // Xử lý kết quả của allHtml
      console.log(allHtml);

      return { message: 'EPUB generation initiated', data: allHtml };
    } catch (error) {
      console.error('Failed to generate EPUB', error);
      throw new HttpException(
        'Failed to generate EPUB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthGuard)
  @Post('create')
  async createEpub(@Body() body: CreateEpubDto, @Request() req) {
    try {
      console.log('req', req.user._id);
      console.log(body, 'body');

      // this.epubService.createEpub({...body,userId:"1"});
      // const newItem = {
      //   userId: req.user._id,
      //   properties: {},
      //   status: {
      //     visibility: 'private',
      //     likes: 0,
      //   },
      //   ...body,
      // };
      return this.epubService.createEpub({
        userId: req.user._id,
        properties: {},
        status: {
          visibility: 'private',
          likes: 0,
        },
        ...body,
      });
    } catch (error) {
      console.error('Failed to create EPUB', error);
      throw new HttpException(
        'Failed to create EPUB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthGuard)
  @Post('update')
  async update(@Body() body: any, @Request() req) {
    try {
      console.log('req', req.user._id);
      console.log(body, 'body');

      // this.epubService.createEpub({...body,userId:"1"});
      return this.epubService.updateObject(body, req.user._id);
    } catch (error) {
      console.error('Failed to create EPUB', error);
      throw new HttpException(
        'Failed to create EPUB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
