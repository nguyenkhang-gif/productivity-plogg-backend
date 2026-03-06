import { Injectable, OnModuleInit } from '@nestjs/common';
import { BudgetService } from 'src/budget/budget.service';
import { ConversationService } from 'src/conversation/conversation.service';

@Injectable()
export class OllamaService implements OnModuleInit {
  onModuleInit() {
    console.log('OllamaService has been initialized.');
  }

  constructor(
    private readonly conversationService: ConversationService,
    private readonly budgetService: BudgetService,
  ) {}

  async generateContent(messages: any): Promise<any> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'ameliaEvil:latest',
        messages: messages, // trực tiếp chuỗi
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Ollama API error:', text);
      throw new Error(`Ollama API returned status ${response.status}`);
    }

    console.log('Ollama API response received successfully.');

    const data = await response.json();
    return data;
  }

  async promptWithUserId(prompt: string, userId: string): Promise<any> {
    let conversations =
      await this.conversationService.getUserConversations(userId);
    if (!conversations) {
      conversations = await this.conversationService.addMessage(
        userId,
        'user',
        [{ text: prompt }],
      );
    }

    let messages = [...conversations.messages];
    messages.push({
      role: 'user',
      parts: [{ text: prompt }],
      timestamp: new Date(),
    });

    let finalMessages = JSON.parse(JSON.stringify(messages)).map((msg) => {
      return {
        role: msg.role,
        content: msg.parts.map((part) => part.text).join(' '),
      };
    });

    finalMessages.push({ role: 'user', content: prompt });

    const content = await this.generateContent(finalMessages);
    // Tương tự như generateContent, nhưng có thể thêm logic liên quan đến userId nếu cần
    const aiRes = content.message;

    let matchJson = aiRes.content.match(/\{[\s\S]*"actions"[\s\S]*\}/);
    // console.log('matchJson', JSON.parse(matchJson[0]));

    messages.push({
      role: 'assistant',
      parts: [{ text: aiRes.content }],
      timestamp: new Date(),
    });

    if (messages.length > 10) {
      messages = messages.slice(messages.length - 10);
    }

    // await this.conversationService.editConversation(
    //   conversations._id as string,
    //   {
    //     ...conversations,
    //     messages: messages as any,
    //   },
    // );

    return { content, conversations };
  }
}
