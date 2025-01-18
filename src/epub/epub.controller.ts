import { Body, Controller, Post } from '@nestjs/common';
import { EpubService } from './epub.service';
import { epubI } from './interfaces/epub.interface';
import { OptionsI } from './interfaces/options.interface';

@Controller('api/epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}

  @Post('create')
  async createEpub(@Body() body: { data: epubI }) {
    try {
      const epub = await this.epubService.create(body.data);
      return epub;
    } catch (err) {
      console.log(err);
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
}
