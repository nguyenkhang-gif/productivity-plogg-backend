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
  async generateContent(prompt: string): Promise<object> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response;
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async promptWithImg(
    prompt: string,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      // Chuyển đổi Buffer thành Base64
      const imgBuffer = file.buffer.toString('base64');

      // Tạo dữ liệu hình ảnh theo yêu cầu
      const imageData = {
        inlineData: {
          mime_type: file.mimetype,
          data: imgBuffer,
        },
      };
      // console.log(imageData.mime_type);

      // Tạo input cho generateContent gồm ảnh và prompt
      const input = [imageData, prompt];

      // Gửi yêu cầu tới API với input đã tạo
      const response = await this.model.generateContent(input);

      return response;
    } catch (error) {
      throw new Error(
        `Failed to generate content with image: ${error.message}`,
      );
    }
  }
}
