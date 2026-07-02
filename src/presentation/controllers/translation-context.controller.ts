import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import {
  CreateTranslationContextDto,
  UpdateTranslationContextDto,
} from 'src/core/dtos/translation-context.dto';
import { CreateTranslationContextUseCase } from 'src/use-case/translation-context/create-translation-context.use-case';
import { GetTranslationContextUseCase } from 'src/use-case/translation-context/get-translation-context.use-case';
import { GetUserTranslationContextsUseCase } from 'src/use-case/translation-context/get-user-translation-contexts.use-case';
import { UpdateTranslationContextUseCase } from 'src/use-case/translation-context/update-translation-context.use-case';
import { DeleteTranslationContextUseCase } from 'src/use-case/translation-context/delete-translation-context.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/translation-contexts')
export class TranslationContextController {
  constructor(
    private readonly create: CreateTranslationContextUseCase,
    private readonly getOne: GetTranslationContextUseCase,
    private readonly getAll: GetUserTranslationContextsUseCase,
    private readonly updateOne: UpdateTranslationContextUseCase,
    private readonly deleteOne: DeleteTranslationContextUseCase,
  ) {}

  @Post()
  async createContext(@Req() req, @Body() dto: CreateTranslationContextDto) {
    return this.create.execute(req.user.userId, dto);
  }

  @Get()
  async listContexts(@Req() req) {
    return this.getAll.execute(req.user.userId);
  }

  @Get(':id')
  async getContext(@Req() req, @Param('id') id: string) {
    return this.getOne.execute(id, req.user.userId);
  }

  @Patch(':id')
  async updateContext(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTranslationContextDto,
  ) {
    return this.updateOne.execute(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContext(@Req() req, @Param('id') id: string) {
    return this.deleteOne.execute(id, req.user.userId);
  }
}
