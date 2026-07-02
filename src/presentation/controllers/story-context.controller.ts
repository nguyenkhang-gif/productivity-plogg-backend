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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import {
  CreateStoryContextDto,
  UpdateStoryContextDto,
} from 'src/core/dtos/story-context.dto';
import { CreateStoryContextUseCase } from 'src/use-case/story-context/create-story-context.use-case';
import { GetStoryContextUseCase } from 'src/use-case/story-context/get-story-context.use-case';
import { GetUserStoryContextsUseCase } from 'src/use-case/story-context/get-user-story-contexts.use-case';
import { UpdateStoryContextUseCase } from 'src/use-case/story-context/update-story-context.use-case';
import { DeleteStoryContextUseCase } from 'src/use-case/story-context/delete-story-context.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/story-contexts')
export class StoryContextController {
  constructor(
    private readonly create: CreateStoryContextUseCase,
    private readonly getOne: GetStoryContextUseCase,
    private readonly getAll: GetUserStoryContextsUseCase,
    private readonly updateOne: UpdateStoryContextUseCase,
    private readonly deleteOne: DeleteStoryContextUseCase,
  ) {}

  @Post()
  async createContext(@Req() req, @Body() dto: CreateStoryContextDto) {
    return this.create.execute(req.user.userId, dto);
  }

  @Get()
  async listContexts(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.getAll.execute(req.user.userId, Number(page), Number(limit));
  }

  @Get(':id')
  async getContext(@Req() req, @Param('id') id: string) {
    return this.getOne.execute(id, req.user.userId);
  }

  @Patch(':id')
  async updateContext(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateStoryContextDto,
  ) {
    return this.updateOne.execute(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContext(@Req() req, @Param('id') id: string) {
    return this.deleteOne.execute(id, req.user.userId);
  }
}
