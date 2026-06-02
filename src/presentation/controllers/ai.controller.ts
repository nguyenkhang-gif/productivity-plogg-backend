import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { PromptTestUseCase } from 'src/use-case/ai/prompt-test.use-case';

class PromptDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

@UseGuards(JwtAuthGuard)
@Controller('api/ai')
export class AiController {
  constructor(private readonly promptTestUseCase: PromptTestUseCase) {}

  @Post('prompt')
  async testPrompt(@Body() body: PromptDto) {
    return this.promptTestUseCase.execute(body.prompt);
  }
}
