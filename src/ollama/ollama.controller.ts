import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OllamaService } from './ollama.service';

@Controller('api/ollama')
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Post('generate')
  async generate(@Body() body: { prompt: string }) {
    const content = await this.ollamaService.generateContent(body.prompt);
    return content;
  }

  @Post('generate-with-user-id')
  async generateWithUserId(@Body() body: { prompt: string }, @Req() req) {
    const content = await this.ollamaService.promptWithUserId(
      body.prompt,
      req.user.userId,
    );
    return content;
  }
}
