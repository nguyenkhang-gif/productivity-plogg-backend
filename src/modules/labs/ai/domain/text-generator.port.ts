export const TEXT_GENERATOR = 'TEXT_GENERATOR';

export interface TextGeneratorPort {
  generateText(prompt: string): Promise<string>;
}
