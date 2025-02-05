import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { EpubService } from './epub.service';
import { epubI } from './interfaces/epub.interface';
import { OptionsI } from './interfaces/options.interface';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('api/epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}

  @UseGuards(AuthGuard)
  @Post('create')
  async createEpub(@Body() body: { data: epubI }, @Req() req) {
    try {
      console.log('create epub', body, req.user);

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
      console.log('epub', epub);

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

  @Post('generate-epub')
  async generateEpub(@Body() body: { options: OptionsI }) {
    try {
      const epub = await this.epubService.generateEpub(body.options);
      return epub;
    } catch (err) {
      console.log(err);
    }
  }

  @Post('parse-epub')
  async parseEpub(
    @Body() body: { html?: string; formated: object; url?: string },
  ) {
    try {
      console.log(body.html, 'html get from the boddy');

      // prepearing the html

      const epub = await this.epubService.parseHtml(
        body.html,
        body.formated,
        body.url,
      );
      return JSON.parse(epub);
    } catch (err) {
      console.log(err);
    }
  }
}
