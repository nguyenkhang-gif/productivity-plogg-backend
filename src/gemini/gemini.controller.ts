import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('api/gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @UseGuards(AuthGuard)
  @Post('prompt')
  async prompt(@Body() body: { prompt: string }) {
    const { prompt } = body;
    const content = await this.geminiService.generateContent(prompt);
    return content;
  }
}
