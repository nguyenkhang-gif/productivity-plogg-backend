import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { EpubService } from 'src/infrastructure/epub/epub.service';

@Controller('api/gemini')
export class GeminiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly epubService: EpubService,
  ) {}

  @Post('prompt')
  async prompt(@Body() body: { prompt: string }) {
    const content = await this.geminiService.generateContent(body.prompt);
    return content;
  }
  
  @Post('prompt-with-personal')
  async promptWithPersonal(@Body() body: { prompt: string },@Req() req) {
    const content = await this.geminiService.generateContentWithPersonal(
      body.prompt,
    );
    return content;
  }

  @Post('prompt-with-actions')
  async promptWithActions(@Body() body: { prompt: string }, @Req() req) {
    const { user } = req;
    console.log('user', user);
    const content = await this.geminiService.generateContentWithActionsV2(
      body.prompt,
      user.userId,
    );
    return content;
  }

  @Post('prompt-to-get-json-from-html')
  async promptWithjson(@Body() body: { url: string }) {
    const html = await fetch(body.url);
    const htmlText = await html.text(); 

    const prompt = `
      Phân tích HTML sau và TRẢ VỀ DUY NHẤT một JSON hợp lệ (không giải thích thêm).
      Nếu không tìm thấy phần nào thì để null.

      Format JSON bắt buộc:
      {
        "chapter_title": { "tag": "...", "id": "...", "class": "..." },
        "chapter_content": { "tag": "...", "id": "...", "class": "..." }
      }

      Chỉ trả về JSON thuần, KHÔNG được trả lời thêm.

      HTML:
      ${htmlText}
      `;
    const content: any = await this.geminiService.generateContent(prompt);

    const jsonString = content.data.candidates[0].content.parts[0].text
      .replace(/```json|```/g, '')
      .trim();

    const chapterInfo = await this.epubService.parseHtml(
      htmlText,
      JSON.parse(jsonString),
      '',
    );

    return {
      format: JSON.parse(jsonString),
      chapterInfo: JSON.parse(JSON.stringify(chapterInfo)),
    };
  } 
}
