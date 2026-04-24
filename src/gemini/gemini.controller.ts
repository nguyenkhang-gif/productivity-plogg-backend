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
import { EpubService } from 'src/epub/epub.service';

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
    // const content = await this.geminiService.generateContentWithActionsV2(
    //   body.prompt, req.user.userId
    // );
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

  // @UseGuards(AuthGuard)
  @Post('prompt-to-get-json-from-html')
  async promptWithjson(@Body() body: { url: string }) {
    const html = await fetch(body.url);

    const htmlText = await html.text(); // Lấy nội dung HTML từ phản hồi

    // console.log("debug parese chapter ", htmlText);
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

    console.log(content, 'content');

    const jsonString = content.data.candidates[0].content.parts[0].text
      .replace(/```json|```/g, '')
      .trim();

    console.log(jsonString, 'jsonString');

    const chapterInfo = await this.epubService.parseHtml(
      htmlText,
      JSON.parse(jsonString),
      '',
    );

    // return content
    // return content.candidates[0].content.parts[0].text;
    return {
      format: JSON.parse(jsonString),
      chapterInfo: JSON.parse(JSON.stringify(chapterInfo)),
    };
  }

  @Post('prompt-with-img')
  @UseInterceptors(FileInterceptor('file'))
  async promptWithImg(
    @Body() body: { prompt: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const res = await this.geminiService.promptWithImg(body.prompt, file);
      return res;
    } catch (err) {
      console.log(err);
    }
  }

  @Get('clear-context')
  async clearContext(@Req() req) {
    // Logic to clear context, e.g., reset session or conversation history
    await this.geminiService.clearConversations(req.user.userId);
    return { message: 'Context cleared successfully' };
  }

  @Post('create-brain')
  async createBrain() {
    const brain = await this.geminiService.createBrain({});
    return brain;
  }
}
