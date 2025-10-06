import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { EpubService } from 'src/epub/epub.service';

@Controller('api/gemini')
export class GeminiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly epubService: EpubService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('prompt')
  async prompt(@Body() body: { prompt: string }) {
    const content = await this.geminiService.generateContent(body.prompt);
    return content;
  }
  @UseGuards(AuthGuard)
  @Post('prompt-with-personal')
  async promptWithPersonal(@Body() body: { prompt: string }) {
    const content = await this.geminiService.generateContentWithPersonal(
      body.prompt,
    );
    return content;
  }
  @Post('prompt-with-actions')
  async promptWithActions(@Body() body: { prompt: string }) {
    const content = await this.geminiService.generateContentWithActions(
      body.prompt,
    );
    return content;
  }

  // @UseGuards(AuthGuard)
  @Post('prompt-to-get-json-from-html')
  async promptWithjson(@Body() body: { url: string }) {
    const html = await fetch(body.url);
    const htmlText = await html.text(); // Lấy nội dung HTML từ phản hồi
    // console.log("debug parese chapter ", htmlText);
    const prompt = `Phân tích cấu trúc của nó cho tôi 1 json bao gồm tag,class,id của tiêu đề chapter. tag,class,id của nội dung chapter thường là thẻ p, nếu có 1 parent bao quanh các thẻ đó thì lấy nó ko cần lấy thẻ con  :${htmlText} `;
    const content: any = await this.geminiService.generateContent(prompt);
    const jsonString = content.candidates[0].content.parts[0].text
      .replace(/```json|```/g, '')
      .trim();
    console.log(JSON.parse(jsonString), 'jsonString');

    const chapterInfo = await this.epubService.parseHtml(
      htmlText,
      JSON.parse(jsonString),
      '',
    );
    // return content
    // return content.candidates[0].content.parts[0].text;
    return {
      format: JSON.parse(jsonString),
      chapterInfo: JSON.parse(chapterInfo),
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
}
