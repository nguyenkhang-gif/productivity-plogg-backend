import { Inject, Injectable } from '@nestjs/common';
import {
  TEXT_GENERATOR,
  TextGeneratorPort,
} from 'src/modules/labs/ai/domain/text-generator.port';

@Injectable()
export class PromptTestUseCase {
  constructor(
    @Inject(TEXT_GENERATOR) private readonly textGenerator: TextGeneratorPort,
  ) {}

  async execute(prompt: string): Promise<{ result: string }> {
    const result = await this.textGenerator.generateText(prompt);
    return { result };
  }
}
