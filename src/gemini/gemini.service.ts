import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class GeminiService implements OnModuleInit {
  private GenAI: GoogleGenerativeAI;
  private model: any;
  async onModuleInit() {
    console.log('gemini init.......');
    this.GenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.GenAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response;
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
}
