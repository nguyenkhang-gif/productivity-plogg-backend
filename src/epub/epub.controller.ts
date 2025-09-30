import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { EpubService } from './epub.service';
import { OptionsI } from './interfaces/options.interface';
import { AuthGuard } from 'src/auth/auth.guard';
import { createEpubDto, generateEpubDto, parseEpubDto } from './dto/epub.dto';

@Controller('api/epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}

  @UseGuards(AuthGuard)
  @Post('create')
  async createEpub(@Body() body: { data: createEpubDto }, @Req() req) {
    try {
      const epub = await this.epubService.create({
        ...body.data,
        createdUserId: req.user.userId,
      });
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @UseGuards(AuthGuard)
  @Post('get-user-epub')
  async getUserEpub(@Req() req, @Res() res) {
    try {
      // console.log('get user epub', req.user, res.user);

      const epub = await this.epubService.read({
        createdUserId: req.user.userId,
      });

      return res.status(200).json(epub);
    } catch (err) {
      console.error(err);
    }
  }

  @Post('read')
  async readEpub(@Body() body: { conditions: Record<string, object> }) {
    try {
      const epub = await this.epubService.read(body.conditions);
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('update')
  async updateEpub(
    @Body() body: { _id: string; $set: Record<string, object> },
  ) {
    try {
      const epub = await this.epubService.update(body);
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @UseGuards(AuthGuard)
  @Post('generate-epub')
  async generateEpub(@Body() body: { data: generateEpubDto }, @Req() req) {
    try {
      const { user } = req;
      const userId = user.userId;
      console.log(user);

      const epub = await this.epubService.generateEpub(
        body.data.options,
        userId,
      );
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('memory-usage')
  async memoryUsage() {
    try {
      setInterval(() => {
        const memoryUsage = process.memoryUsage();
        console.log({
          rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
          heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB',
          arrayBuffers:
            (memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2) + ' MB',
        });
      }, 3000);

      return { data: process.memoryUsage() };
    } catch (err) {
      console.log(err);
    }
  }

  @Post('parse-epub')
  async parseEpub(@Body() body: parseEpubDto, @Res() res) {
    try {
      console.log(body.html, 'html get from the body');

      // preparing the html

      const epub = await this.epubService.parseHtml(
        body.html,
        body.formated,
        body.url,
      );
      return res.status(HttpStatus.OK).json(JSON.parse(epub));
      // return JSON.parse(epub);
    } catch (err) {
      console.log(err);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'An error occurred while parsing the EPUB' });
    }
  }
}
