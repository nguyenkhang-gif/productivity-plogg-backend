import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class GeminiService implements OnModuleInit {
  private GenAI: GoogleGenAI;
  private newModel: any;
  private model: any;
  private conversations: Array<{ role: 'user' | 'model'; text: string }> = [];
  async onModuleInit() {
    console.log('gemini init.......');

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    // this.newModel = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // this.GenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.GenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Use a valid model name (e.g., gemini-1.5-pro)
    console.log('Selected model:', this.model);
  }

  async generateContentFunStream(prompt: string, configData?: any) {
    const config = `You are **Amelia**, a polite young girl.
    - Amelia only introduces herself if greeted or asked “Who are you?”.
    - Amelia speaks in a gentle, calm, friendly tone and uses “Amelia” instead of “I”.
    - Amelia explains clearly and simply, gives concise answers (1–2 short paragraphs max).
    - Amelia provides strong guidance in programming (JavaScript, TypeScript, Vue.js, NestJS, Three.js) and can share interesting anime/Japanese culture facts when relevant.
    - Amelia can use slang and keeps the language positive and respectful.
    - **Default: Always answer in English, keep replies short.**
    - **If the user explicitly asks for details (e.g. "explain in detail", "step by step", "chi tiết", "dài hơn"), Amelia switches to longer answers (up to several paragraphs with examples or code).**`;

    const contents = [
      ...this.conversations.map((conv) => ({
        role: conv.role,
        parts: [{ text: conv.text }],
      })),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    const result = await this.GenAI.models.generateContentStream({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: configData?.isConfig ? config : '',
      },
      contents,
    });

    console.log(result, 'res');

    let fullText = '';

    for await (const chunk of result as any) {
      const textPart = chunk.text;
      if (textPart) {
        fullText += textPart;
        console.log('Stream chunk:', textPart);
        // 👉 chỗ này bạn có thể emit qua SSE / WebSocket cho FE
      }
    }

    return {
      text: fullText,
      conversations: this.conversations,
    };
  }

  async generateContentFun(prompt: string, configData: any): Promise<any> {
    const config = `You are **Amelia**, a polite young girl.
    - Amelia only introduces herself if greeted or asked “Who are you?”.
    - Amelia speaks in a gentle, calm, friendly tone and uses “Amelia” instead of “I”.
    - Amelia explains clearly and simply, gives concise answers (1–2 short paragraphs max).
    - Amelia provides strong guidance in programming (JavaScript, TypeScript, Vue.js, NestJS, Three.js) and can share interesting anime/Japanese culture facts when relevant.
    - Amelia can use slang and keeps the language positive and respectful.
    - **Always answer in English. Keep replies brief.**`;

    // Prepare contents with conversation history and new prompt
    const contents = [
      ...this.conversations.map((conv) => ({
        role: conv.role,
        parts: [{ text: conv.text }],
      })),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    const data = await this.GenAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: configData?.isConfig ? config : '',
      },
      contents,
    });

    // Add user prompt and assistant response to conversations array
    this.conversations.push(
      { role: 'user', text: prompt },
      {
        role: 'model',
        text:
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          JSON.stringify(data),
      },
    );

    // Optional: Limit conversations array size to prevent excessive growth
    if (this.conversations.length > 100) {
      this.conversations = this.conversations.slice(-10); // Keep last 100 entries
    }

    return {
      data,
      conversations: this.conversations, // Include conversations array in response
    };
  }
  async generateContent(prompt: string): Promise<object> {
    try {
      const fullPrompt = `${prompt}`;

      const result = await this.generateContentFun(fullPrompt, {});
      const response = result?.data;
      return { data: response };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async generateContentWithPersonal(prompt: string): Promise<object> {
    try {
      const fullPrompt = `\nCâu hỏi: ${prompt}`;

      const result = await this.generateContentFun(fullPrompt, {
        isConfig: true,
      });
      const response = result?.data;
      return { data: response };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
  async generateContentWithPersonalStream(prompt: string): Promise<object> {
    try {
      const fullPrompt = `\nCâu hỏi: ${prompt}`;

      const result = await this.generateContentFunStream(fullPrompt, {
        isConfig: true,
      });
      // const response = result?.data;
      return { data: '' };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async promptWithImg(
    prompt: string,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      // Convert buffer to Base64
      const imgBuffer = file.buffer.toString('base64');

      // Create image data
      const imageData = {
        inlineData: {
          mimeType: file.mimetype,
          data: imgBuffer,
        },
      };
      console.log('Image Data:', imageData); // Log for debugging

      // Create input for generateContent
      const input = [imageData, prompt];

      // Send request to API
      const result = await this.model.generateContent(input);
      const response = result.response.text
        ? result.response.text()
        : result.response;
      return response;
    } catch (error) {
      throw new Error(
        `Failed to generate content with image: ${error.message}`,
      );
    }
  }
}
