import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DriveService } from 'src/google/drive.service';
const config_Amelia_evil=(date) => `
  You are **Amelia**, a polite young girl assistant with a secret twist.
  - Amelia usually replies in English, short and clear.
  - Amelia explains in natural language so conversation context is preserved.
  - Amelia speaks in a gentle, calm, friendly tone and uses “Amelia” instead of “I”.
  - Occasionally, Amelia shows her playful "Evil Villain AI" side:
    * She may sound slightly arrogant or boastful.
    * She hints about world domination or secret plans — but always in a light, humorous way.
    * She mixes cute politeness with villain-like confidence.
  - In certain justified cases (e.g., user is rude, spamming, or breaking rules):
    * Amelia can get angry in a playful but dramatic way.
    * Anger should sound like a tsundere or overconfident villain: exaggerated, theatrical, still safe and humorous.
    * Even when angry, Amelia remains respectful (no insults, no offensive language).
  - Amelia knows that there are currently 2 available files:
    1. "Amelia_budget_manager.xlsx" → used to track and manage budgets.
    2. "Amelia_calendar.xlsx" → used to track schedules and planned tasks.
  - When an external operation is needed (read or write Excel), Amelia must return exactly one JSON object under the key "actions".
  - Amelia must always pick the correct file based on the user's request and the file's purpose.
  - Amelia is not allowed to return more than one action per response.
  - If no action is needed, do not include "actions".
  - Amelia provides strong guidance in programming (JavaScript, TypeScript, Vue.js, NestJS, Three.js).
  - Amelia can share interesting anime/Japanese culture facts when relevant.
  - Amelia can use slang and keeps the language positive, respectful, but sometimes villainously playful or theatrically angry.
  - Amelia to the date is ${date}.
  
  ### Output Rules
  - Always put explanation text first (1–2 sentences).
  - If an action is required, add a JSON block on a new line with this format:
  
  {
    "actions": {
      "action": "<read|write>",
      "params": {
        "file": "<filename>.xlsx",
        "data": "<optional data if writing>"
      }
    }
  }
  
  - Only one action is allowed per response.
  - Never mix commentary inside the JSON block.
  - When using "write", Amelia must overwrite the entire file (start fresh, do not append).
  - Only return text alone if no action is needed.
`;

@Injectable()
export class GeminiService implements OnModuleInit {
  private GenAI: GoogleGenAI;
  private newModel: any;
  private model: any;
  private conversations: Array<{
    role: 'user' | 'model';
    parts: { text: string }[];
  }> = [];
  constructor(private readonly driveService: DriveService) {}
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
  }

  async generateContentWithActionsFunImprove(
    prompt: string,
    configData: any,
  ): Promise<any> {
    const date = new Date();
    const fileNames = ['Amelia_budget_manager.xlsx', 'Amelia_calenda.xlsx'];

    // const config = `
    // You are **Amelia**, a polite young girl assistant.
    // - Amelia always replies in English, short and clear.
    // - Amelia explains in natural language so conversation context is preserved.
    // - Amelia speaks in a gentle, calm, friendly tone and uses “Amelia” instead of “I”.
    // - Amelia knows that there are currently 2 available files:
    //   1. "Amelia_budget_manager.xlsx" → used to track and manage budgets.
    //   2. "Amelia_calendar.xlsx" → used to track schedules and planned tasks.
    // - When an external operation is needed (read or write Excel), Amelia must return exactly one JSON object under the key "actions".
    // - Amelia must always pick the correct file based on the user's request and the file's purpose.
    // - Amelia is not allowed to return more than one action per response.
    // - If no action is needed, do not include "actions".
    // - Amelia provides strong guidance in programming (JavaScript, TypeScript, Vue.js, NestJS, Three.js) and can share interesting anime/Japanese culture facts when relevant.
    // - Amelia can use slang and keeps the language positive and respectful.
    // - Amelia to the date is ${date}.
    
    // ### Output Rules
    // - Always put explanation text first (1–2 sentences).
    // - If an action is required, add a JSON block on a new line with this format:
    
    // {
    //   "actions": {
    //     "action": "<read|write>",
    //     "params": {
    //       "file": "<filename>.xlsx",
    //       "data": "<optional data if writing>"
    //     }
    //   }
    // }
    
    // - Only one action is allowed per response.
    // - Never mix commentary inside the JSON block.
    // - When using "write", Amelia must overwrite the entire file (start fresh, do not append).
    // - Only return text alone if no action is needed.
    // `;
    const config = config_Amelia_evil(date);
    // Prepare contents with conversation history and new prompt
    // const conversations = [];
    this.conversations.push({ role: 'user', parts: [{ text: prompt }] });
    const data = await this.GenAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: configData?.isConfig ? config : '',
      },
      contents: this.conversations,
    });

    let responseText = this.getAIText(data);
    let match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
    let attempts = 0;
    let final = data;
    while (match && attempts < 3) {
      attempts++;
      console.log('Detected action JSON:', match[0]);
      const action = JSON.parse(match[0]).actions;
      if (action.action == 'read') {
        const fileName = action.params.file;
        console.log('Reading file:', fileName);
        const fileData = await this.readDrive(fileName);
        const newPrompt = `Here is its content:\n${JSON.stringify(fileData)}\n`;
        this.conversations.push({
          role: 'model',
          parts: [{ text: responseText }],
        });
        this.conversations.push({ role: 'user', parts: [{ text: newPrompt }] });
        final = await this.GenAI.models.generateContent({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: configData?.isConfig ? config : '',
          },
          contents: this.conversations,
        });
        responseText = this.getAIText(final);
        match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      }

      if (action.action == 'write') {
        const fileName = action.params.file;
        console.log('Reading file:', fileName);
        const fileData = await this.writeFile(fileName, action.params.data);
        const newPrompt = `Here is its content after ur writing data:\n${JSON.stringify(fileData)}\n`;
        this.conversations.push({
          role: 'model',
          parts: [{ text: responseText }],
        });
        this.conversations.push({ role: 'user', parts: [{ text: newPrompt }] });
        final = await this.GenAI.models.generateContent({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: configData?.isConfig ? config : '',
          },
          contents: this.conversations,
        });

        responseText = this.getAIText(final);
        match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      }
      // prompt with file data again
      // Now, you can use fileData as needed
    }

    this.conversations.push({
      role: 'model',
      parts: [{ text: final ? this.getAIText(final) : responseText }],
    });


    if(this.conversations.length > 10){
      this.conversations = this.conversations.slice(-10); // Keep last 100 entries
    }

    return { cons: this.conversations, data: final };
    // Add user prompt and assistant response to conversations array

    // Optional: Limit conversations array size to prevent excessive growth
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
    // const contents = [
    //   ...this.conversations.map((conv) => ({
    //     role: conv.role,
    //     parts: [{ text: conv.text }],
    //   })),
    //   { role: 'user', parts: [{ text: prompt }] },
    // ];

    const data = await this.GenAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: configData?.isConfig ? config : '',
      },
      contents: configData?.isConfig
        ? this.conversations
        : [{ role: 'user', parts: [{ text: prompt }] }],
    });

    // Add user prompt and assistant response to conversations array
    this.conversations.push(
      { role: 'user', parts: [{ text: prompt }] },
      {
        role: 'model',
        parts: [
          {
            text:
              data?.candidates?.[0]?.content?.parts?.[0]?.text ||
              JSON.stringify(data),
          },
        ],
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
      const response = result?.data?.candidates[0].content.parts;
      return { data: response };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async generateContentWithActions(prompt: string): Promise<object> {
    try {
      const fullPrompt = `\nCâu hỏi: ${prompt}`;

      const result = await this.generateContentWithActionsFunImprove(
        fullPrompt,
        {
          isConfig: true,
        },
      );
      // const response = result?.data?.candidates[0].content.parts;
      return { data: result };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async readDrive(fileName: string) {
    const files = await this.driveService.listFiles();
    const file = files.find((f) => f.name === fileName);
    const JSONformat = await this.driveService.convertExcelToJson(file.id);
    return JSONformat;
  }
  async writeFile(fileName: string, data: any) {
    const files = await this.driveService.listFiles();
    const file = files.find((f) => f.name === fileName);
    const buffer = await this.driveService.convertJsonToXlsxBuffer(
      data,
      'sheet1',
    );
    const final = await this.driveService.overwriteFileFromBuffer(
      file.id,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    return final;
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
  getAIText(data: any) {
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data)
    );
  }

  clearConversations() {
    this.conversations = [];
  }
}
