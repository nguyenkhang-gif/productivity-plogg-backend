import { Injectable } from '@nestjs/common';
import { GeminiService } from 'src/infrastructure/ai/gemini.service';

@Injectable()
export class PromptTestUseCase {
  constructor(private readonly geminiService: GeminiService) {}

  async execute(prompt: string): Promise<{ result: string }> {
    const result = await this.geminiService.generateText(prompt);
    return { result };
  }
}
