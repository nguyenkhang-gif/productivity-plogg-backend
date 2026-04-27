// import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DriveService } from 'src/google/drive.service';
import { Brain, BrainDocument } from './schema/brain.schema';
import { Model } from 'mongoose';
import { BudgetService } from 'src/budget/budget.service';

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

export const functionActions = [
  {
    name: 'getUserBudget',
    description: "Query user's budget data with filters, sorting, and limit.",
    parameters: {
      type: 'object',
      properties: {
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
  
  constructor(
    private readonly driveService: DriveService,
    private readonly budgetService: BudgetService,
    @InjectModel(Brain.name) private brainModel: Model<BrainDocument>,
  ) {}

  async onModuleInit() {
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
    
    const conversations: any[] = [{ role: 'user', parts: [{ text: prompt }] }];

    const data = await this.GenAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: configData?.isConfig ? config : '',
      },
      contents: conversations,
    });

    let responseText = this.getAIText(data);
    let match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
    let attempts = 0;
    let final = data;

    while (match && attempts < 3) {
      attempts++;
      const action = JSON.parse(match[0]).actions;
      if (action.action == 'read') {
        const fileName = action.params.file;
        const sheetTableName = action.params.param.sheetTableName;
        const fileData = await this.readDrive(fileName);
        const newPrompt = sheetTableName
          ? `Here is its content:\n${JSON.stringify(fileData[sheetTableName] ?? [])}\n`
          : `Here is its content:\n${JSON.stringify(fileData)}\n`;
        final = await this.addAndPrompt(
          responseText,
          newPrompt,
          configData,
          config,
          conversations,
        );
        responseText = this.getAIText(final);
        match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      } else if (action.action == 'readJson') {
        const fileName = action.params.file.replace('.json', '');
        if (fileName === 'Amelia_brain') {
          const brainData = await this.brainModel.findOne().sort({ _id: -1 }).exec();
          const newPrompt = `Here is its content:\n${JSON.stringify(brainData?.data ?? {})}\n`;
          final = await this.addAndPrompt(
            responseText,
            newPrompt,
            configData,
            config,
            conversations,
          );
          responseText = this.getAIText(final);
          match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
        }
      } else if (action.action == 'write') {
        const fileName = action.params.file;
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
          conversations,
        );
        responseText = this.getAIText(final);
        match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      } else if (action.action == 'writeJson') {
        const fileName = action.params.file.replace('.json', '');
        if (fileName === 'Amelia_brain') {
          const brainData = await this.updateBrain(
            '68e4d0228d3d424ff747d563',
            action.params.data,
          );
          const newPrompt = `Here is its updated content:\n${JSON.stringify(brainData?.data ?? {})}\n`;
          final = await this.addAndPrompt(
            responseText,
            newPrompt,
            configData,
            config,
            conversations,
          );
          responseText = this.getAIText(final);
          match = responseText.match(/\{[\s\S]*"actions"[\s\S]*\}/);
        }
      }
    }

    conversations.push({
      role: 'model',
      parts: [{ text: final ? this.getAIText(final) : responseText }],
    });

    return { cons: conversations, data: final };
  }

  async generateContentFun(prompt: string, configData: any): Promise<any> {
    const config = `You are **Amelia**, a polite young girl.
    - Amelia only introduces herself if greeted or asked “Who are you?”.
    - Amelia speaks in a gentle, calm, friendly tone and uses “Amelia” instead of “I”.
    - Amelia explains clearly and simply, gives concise answers (1–2 short paragraphs max).
    - Amelia provides strong guidance in programming (JavaScript, TypeScript, Vue.js, NestJS, Three.js) and can share interesting anime/Japanese culture facts when relevant.
    - Amelia can use slang and keeps the language positive and respectful.
    - **Always answer in English. Keep replies brief.**`;

    const conversations = [{ role: 'user', parts: [{ text: prompt }] }];

    const data = await this.GenAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: configData?.isConfig ? config : '',
      },
      contents: conversations,
    });

    conversations.push({
        role: 'model',
        parts: [
          {
            text: data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data),
          },
        ],
    });

    return {
      data,
      conversations: conversations,
    };
  }

  async generateContent(prompt: string): Promise<object> {
    try {
      const result = await this.generateContentFun(prompt, {});
      return { data: result?.data };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async generateContentWithPersonal(prompt: string): Promise<object> {
    try {
      const result = await this.generateContentFun(prompt, { isConfig: true });
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
      const result = await this.generateContentWithActionsFunImprove(
        prompt,
        { isConfig: true },
        userId,
      );
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
      const date = new Date();
      const config = config_Amelia_evil_v3(date);
      const conversations: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
      
      const result = await this.GenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: config,
          tools: [{ functionDeclarations: [functionActions as any] }],
        },
        contents: conversations,
      });

      let AiResponse = (result?.data as any)?.candidates?.[0].content.parts[0];
      let attempts = 0;
      let isCallFuntions = result?.candidates?.[0].content?.parts[1]?.functionCall as any;
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
            functionResult = await this.budgetService.create({ ...functionArgs, userId });
            break;
          default:
            functionResult = { message: 'Unknown function' };
        }

        const newPrompt = `Here is its updated content:\n${JSON.stringify(functionResult ?? {})}\n`;
        conversations.push({ role: 'model', parts: [AiResponse] });
        conversations.push({ role: 'user', parts: [{ text: newPrompt }] });
        
        const newResult = await this.GenAI.models.generateContent({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: config,
            tools: [{ functionDeclarations: [functionActions as any] }],
          },
          contents: conversations,
        });

        AiResponse = (newResult?.data as any)?.candidates?.[0].content.parts[0] || AiResponse;
        isCallFuntions = newResult?.candidates?.[0].content?.parts[1]?.functionCall as any;
      }

      return {
        data: result,
        functionCalls: functionResult,
        cons: conversations,
      };
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async readDrive(fileName: string) {
    const files = await this.driveService.listFiles();
    const file = files.find((f) => f.name === fileName);
    return await this.driveService.convertExcelToJson(file.id);
  }

  async writeFile(fileName: string, data: any, sheetTableName?: string) {
    const [files, json] = await Promise.all([
      this.driveService.listFiles(),
      this.readDrive(fileName),
    ]);
    const file = files.find((f) => f.name === fileName);
    if (sheetTableName) json[sheetTableName] = data;
    const buffer = await this.driveService.convertJsonToXlsxBuffer(json);
    return await this.driveService.overwriteFileFromBuffer(
      file.id,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  getAIText(data: any) {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
  }

  async addAndPrompt(
    responseText: string,
    newPrompt: string,
    configData: any,
    config: any,
    conversations: any[],
  ) {
    conversations.push({ role: 'model', parts: [{ text: responseText }] });
    conversations.push({ role: 'user', parts: [{ text: newPrompt }] });
    return await this.GenAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: configData?.isConfig ? config : '' },
      contents: conversations,
    });
  }

  async updateBrain(id: string, data: any) {
    return await this.brainModel.findByIdAndUpdate(id, { data }, { new: true });
  }
}
