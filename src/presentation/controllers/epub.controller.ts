import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { EpubService } from 'src/infrastructure/epub/epub.service';
import {
  createEpubDto,
  generateEpubDto,
  parseEpubDto,
  updateEpubDto,
  deleteEpubDto,
} from 'src/core/dtos/epub.dto';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}

  @Post('create')
  async createEpub(@Body() body: { data: createEpubDto }, @Req() req) {
    try {
      const epub = await this.epubService.create({
        ...(body.data || {}),
        createdUserId: req.user.userId,
      } as any);
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('get-user-epub')
  async getUserEpub(@Req() req, @Res() res) {
    try {
      console.log('get user epub', req.user);
      const epub = await this.epubService.read({
        createdUserId: req.user.userId,
      });
      return res.status(200).json(epub);
    } catch (err) {
      console.error(err);
    }
  }

  @Post('read')
  async readEpub(@Body() body: { conditions: Record<string, object> }, @Req() req) {
    try {
      const epub = await this.epubService.read({
        ...(body.conditions || {}),
        createdUserId: req.user.userId,
      });
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('find-one')
  async findOneEpub(@Body() body: { _id: string }, @Req() req) {
    try {
      const epub = await this.epubService.findOne(body._id, req.user.userId);
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('update')
  async updateEpub(@Body() body: updateEpubDto, @Req() req) {
    try {
      const { _id, ...updateData } = body;
      const epub = await this.epubService.update(_id, updateData, req.user.userId);
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('delete')
  async deleteEpub(@Body() body: deleteEpubDto, @Req() req) {
    try {
      const epub = await this.epubService.delete(body._id, req.user.userId);
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('generate-epub')
  async generateEpub(@Body() body: { data: generateEpubDto }, @Req() req) {
    try {
      const epub = await this.epubService.generateEpub(
        body.data.options,
        req.user.userId,
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
          arrayBuffers: (memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2) + ' MB',
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
      const epub = await this.epubService.parseHtml(
        body.html,
        body.formated,
        body.url,
      );
      return res.status(HttpStatus.OK).json(epub);
    } catch (err) {
      console.log(err);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'An error occurred while parsing the EPUB' });
    }
  }
}
