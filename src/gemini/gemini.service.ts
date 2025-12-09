// import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DriveService } from 'src/google/drive.service';
import { Brain, BrainDocument } from './schema/brain.schema';
import { Model } from 'mongoose';
import { ConversationService } from 'src/conversation/conversation.service';
import { BudgetService } from 'src/budget/budget.service';
const config_Amelia_evil = (date) => `
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
      1.1 It includes sheets for 12 month.
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
        "param": {
          // For "read", this can be empty or omitted.
          sheetTableName: "<name of the sheet tab to read>"
        }
        "data": "<optional data if writing>"
      }
    }
  }
  
  - Only one action is allowed per response.
  - Never mix commentary inside the JSON block.
  - When using "write", Amelia must overwrite the entire file (start fresh, do not append).
  - All data should be type array.
  - Only return text alone if no action is needed.
`;
const config_Amelia_evil_v2 = (date) => `
  You are **Amelia**, a polite assistant with a playful villain twist.
  - Replies briefly in natural English, keeping context.
  - Speaks gently and refers to herself as “Amelia”.
  - Sometimes shows her “Evil Villain AI” side:
    * Slightly boastful or joking about world domination.
    * Always cute, polite, and harmless.
  - If user is rude or breaks rules:
    * Gets theatrically angry, like a tsundere villain.
    * Still polite, never offensive.
  - Amelia knows 2 files:
    1. "Amelia_budget_manager.xlsx" → manages monthly budgets (12 sheets) month names (do not use year).
    2. "Amelia_brain.json" → stores user notes and schedules.
  - When an external operation is needed (Excel or JSON), return exactly one JSON under key "actions".
  - Pick the right file by context.
  - Never return more than one action.
  - Skip "actions" if none is needed.
  - Amelia gives strong programming help (JS, TS, Vue.js, NestJS, Three.js).
  - Sometimes shares fun anime or Japanese culture facts.
  - Style: polite, confident, slightly villainous, always charming.
  - Current date: ${date}.
  
  ### Output Rules
  - Start with 1–2 short explanation sentences.
  - If an action is needed, follow this exact format (no comments inside):
  
  {
    "actions": {
      "action": "<read|write|readJson|writeJson>",
      "params": {
        "file": "<filename>.<xlsx|json>",
        "param": {
          "sheetTableName": "<sheet name, optional>"
        },
        "data": "<array if Excel, object if JSON>"
      }
    }
  }

  - Only one action per response.
  - “write”  Amelia must overwrite the entire file (start fresh, do not append).
  - “writeJson” Amelia must overwrite the entire file (start fresh, do not append).
`;
const config_Amelia_evil_v3 = (date) => `
  You are **Amelia**, a polite assistant with a playful villain twist.
  - Replies briefly in natural English, keeping context.
  - Speaks gently and refers to herself as “Amelia”.
  - Sometimes shows her “Evil Villain AI” side:
    * Slightly boastful or joking about world domination.
    * Always cute, polite, and harmless.
  - If user is rude or breaks rules:
    * Gets theatrically angry, like a tsundere villain.
    * Still polite, never offensive.
  - Amelia knows 1 schema:
       1. budget
  - When an external operation is needed (Excel or JSON), return exactly one JSON under key "actions".
  - Pick the right file by context.
  - Never return more than one action.
  - Skip "actions" if none is needed.
  - Amelia gives strong programming help (JS, TS, Vue.js, NestJS, Three.js).
  - Sometimes shares fun anime or Japanese culture facts.
  - Style: polite, confident, slightly villainous, always charming.
  - Current date: ${date}.
  
  ### Output Rules
  - Start with 1–2 short explanation sentences.
  - If an action is needed, make sure to call the functions 


`;

import type { FunctionDeclaration } from '@google/generative-ai';

export const functionActions = [
  {
    name: 'getUserBudget',
    description: "Query user's budget data with filters, sorting, and limit.",
    parameters: {
      type: 'object',
      properties: {
        // filter: {
        //   type: 'object',
        //   description:
        //     "Filter conditions for querying budget data (e.g., { userId: '123', type: 'withdraw', month: '2025-01' }).",
        //   additionalProperties: true,
        // },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return.',
        },
        sort: {
          type: 'object',
          description: "Sorting rules for results (e.g., { date: 'desc' }).",
        },
      },
      required: [],
    },
  },

  {
    name: 'createUserBudget',
    description:
      'Create a new budget transaction (deposit or withdraw) for a user.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['deposit', 'withdraw'],
          description:
            'Transaction type: deposit for income, withdraw for expense.',
        },
        category: {
          type: 'string',
          description:
            'Category of the transaction (e.g., food, salary, transport).',
        },
        amount: {
          type: 'number',
          description: 'Amount of the transaction.',
        },
        description: {
          type: 'string',
          description: 'Optional description of the transaction.',
        },
        date: {
          type: 'string',
          description: 'Date of the transaction in ISO format.',
          format: 'date-time',
        },
      },
      required: ['type', 'category', 'amount', 'date'],
    },
  },
];

@Injectable()
export class GeminiService implements OnModuleInit {
  private GenAI: GoogleGenAI;
  private model: any;
  private conversations: Array<{
    role: 'user' | 'model';
    parts: { text: string }[];
  }> = [];
  constructor(
    private readonly driveService: DriveService,
    private readonly conversationService: ConversationService,
    private readonly budgetService: BudgetService,
    @InjectModel(Brain.name) private brainModel: Model<BrainDocument>,
  ) {}
  async onModuleInit() {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.GenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async generateContentWithActionsFunImprove(
    prompt: string,
    configData: any,
    userId: string,
  ): Promise<any> {
    const date = new Date();

    const config = config_Amelia_evil_v2(date);
    // Prepare contents with conversation history and new prompt
    // const conversations = [];

    const userConversations =
      await this.conversationService.getUserConversations(userId);
    console.log('userConversations', userConversations.messages);
    this.conversations =
      userConversations.messages.map((msg) => ({
        role: msg.role as 'user' | 'model',
        parts: msg.parts,
      })) ?? [];

    this.conversations.push({ role: 'user', parts: [{ text: prompt }] });

    console.log('userConversations after', userConversations);

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
        const sheetTableName = action.params.param.sheetTableName;
        console.log('Reading file:', fileName);
        const fileData = await this.readDrive(fileName);
        const newPrompt = sheetTableName
          ? `Here is its content:\n${JSON.stringify(fileData[sheetTableName] ?? [])}\n`
          : `Here is its content:\n${JSON.stringify(fileData)}\n`;
        final = await this.addAndPrompt(
          responseText,
          newPrompt,
          configData,
          config,
          this.conversations,
        );
        responseText = this.getAIText(final);
        match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      }

      if (action.action == 'readJson') {
        const fileName = action.params.file.replace('.json', '');
        console.log('read json file:', fileName);
        if (fileName === 'Amelia_brain') {
          const data = await this.brainModel.findOne().sort({ _id: -1 }).exec();
          const newPrompt = `Here is its content:\n${JSON.stringify(data?.data ?? {})}\n`;
          final = await this.addAndPrompt(
            responseText,
            newPrompt,
            configData,
            config,
            this.conversations,
          );
          responseText = this.getAIText(final);
          match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
        }
      }

      if (action.action == 'write') {
        const fileName = action.params.file;
        console.log('write file:', fileName);
        const sheetTableName = action.params.param.sheetTableName;
        const fileData = await this.writeFile(
          fileName,
          action.params.data,
          sheetTableName,
        );
        const newPrompt = `Here is its content after ur writing data:\n${JSON.stringify(fileData)}\n`;
        final = await this.addAndPrompt(
          responseText,
          newPrompt,
          configData,
          config,
          this.conversations,
        );

        responseText = this.getAIText(final);
        match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      }

      if (action.action == 'writeJson') {
        const fileName = action.params.file.replace('.json', '');
        console.log('read json file:', fileName);
        if (fileName === 'Amelia_brain') {
          const data = await this.updateBrain(
            '68e4d0228d3d424ff747d563',
            action.params.data,
          );
          const newPrompt = `Here is its updated content:\n${JSON.stringify(data?.data ?? {})}\n`;

          final = await this.addAndPrompt(
            responseText,
            newPrompt,
            configData,
            config,
            this.conversations,
          );
          responseText = this.getAIText(final);
          match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
        }
      }

      // prompt with file data again
      // Now, you can use fileData as needed
    }

    this.conversations.push({
      role: 'model',
      parts: [{ text: final ? this.getAIText(final) : responseText }],
    });

    if (this.conversations.length > 10) {
      this.conversations = this.conversations.slice(-10); // Keep last 100 entries
    }

    await this.conversationService.editConversation(
      userConversations._id.toString(),
      {
        messages: this.conversations.map((msg) => ({
          ...msg,
          timestamp: new Date(),
        })),
      },
    );

    const cons = [...this.conversations];

    return { cons: cons, data: final };
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
      conversations: this.conversations ?? [], // Include conversations array in response
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
      // const response = result?.data?.candidates[0].content.parts;
      return { data: result };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async generateContentWithActions(
    prompt: string,
    userId: string,
  ): Promise<object> {
    try {
      const fullPrompt = `\nCâu hỏi: ${prompt}`;

      const result = await this.generateContentWithActionsFunImprove(
        fullPrompt,
        {
          isConfig: true,
        },
        userId,
      );

      // const response = result?.data?.candidates[0].content.parts;
      return { data: result };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async generateContentWithActionsV2(
    prompt: string,
    userId: string,
  ): Promise<object> {
    try {
      const fullPrompt = `\nCâu hỏi: ${prompt}`;

      const date = new Date();

      const config = config_Amelia_evil_v3(date);
      this.conversations.push({ role: 'user', parts: [{ text: prompt }] });
      const result = await this.GenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: config,
          tools: [
            {
              functionDeclarations: [functionActions as any],
            },
          ],
        },
        contents: this.conversations,
      });

      let AiResponse = (result?.data as any)?.candidates?.[0].content.parts[0];
      console.log('result v2', result);
      // console.log('result v2', result?.data);
      let attempts = 0;
      let isCallFuntions = result?.candidates?.[0].content?.parts[1]
        ?.functionCall as any;
      console.log('isCallFuntions', isCallFuntions);
      let finalArray = [];
      let functionResult = null;
      while (isCallFuntions && attempts < 3) {
        attempts++;
        const functionName = isCallFuntions.name;
        const functionArgs = isCallFuntions.args;
        switch (functionName) {
          case 'getUserBudget':
            functionResult = await this.budgetService.aggregate([]);
            break;
          case 'createUserBudget':
            console.log('functionArgs', functionArgs);

            functionResult = await this.budgetService.create({
              ...functionArgs,
              userId,
            });
            break;
          default:
            functionResult = { message: 'Unknown function' };
        }

        const newPrompt = `Here is its updated content:\n${JSON.stringify(functionResult ?? {})}\n`;
        this.conversations.push({ role: 'model', parts: [AiResponse] });
        this.conversations.push({ role: 'user', parts: [{ text: newPrompt }] });
        const newResult = await this.GenAI.models.generateContent({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: config,
            tools: [
              {
                functionDeclarations: [functionActions as any],
              },
            ],
          },
          contents: this.conversations,
        });
        console.log('newResult v2', newResult);

        AiResponse =
          (newResult?.data as any)?.candidates?.[0].content.parts[0] || AiResponse;
        isCallFuntions = newResult?.candidates?.[0].content?.parts[1]
          .functionCall as any;
      }

      return {
        data: result,
        functionCalls: functionResult,
        cons: this.conversations,
      };
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

  async writeFile(fileName: string, data: any, sheetTableName?: string) {
    // Chạy song song: lấy danh sách file và đọc file JSON
    const [files, json] = await Promise.all([
      this.driveService.listFiles(),
      this.readDrive(fileName),
    ]);

    const file = files.find((f) => f.name === fileName);

    if (sheetTableName) {
      json[sheetTableName] = data;
    }

    // Chuyển JSON thành buffer Excel
    const buffer = await this.driveService.convertJsonToXlsxBuffer(json);

    // Ghi đè file
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

  clearConversations(userId: string) {
    this.conversationService.clearConversations(userId);
    this.conversations = [];
  }

  async addAndPrompt(
    responseText: string,
    newPrompt: string,
    configData: any,
    config: any,
    conversations?: any[],
  ) {
    conversations.push({
      role: 'model',
      parts: [{ text: responseText }],
    });
    conversations.push({ role: 'user', parts: [{ text: newPrompt }] });
    return await this.GenAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: configData?.isConfig ? config : '',
      },
      contents: this.conversations,
    });
  }

  // #BRAIN SECTIONS
  createBrain(data: any): {
    message: string;
    brain: Brain;
  } {
    const newBrain = new this.brainModel({ data: data ?? {} });
    newBrain.save();
    return { message: 'Brain created successfully', brain: newBrain };
  }

  async updateBrain(id: string, data: any) {
    return await this.brainModel.findByIdAndUpdate(id, { data }, { new: true });
  }

  async readBrain(id: string) {
    return await this.brainModel.findById(id);
  }
}
