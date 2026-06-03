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
import { EpubService } from 'src/infrastructure/epub/epub.service';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';

class CreateEpubDto {
  sampleUrl?: string;
  properties: Record<string, any>;
}

class UpdateEpubDto {
  sampleUrl?: string;
  properties?: Record<string, any>;
}

@UseGuards(JwtAuthGuard)
@Controller('api/epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}

  @Post()
  async create(@Req() req, @Body() body: CreateEpubDto) {
    return this.epubService.create({
      ...body,
      createdUserId: req.user.userId,
    } as any);
  }

  @Get()
  async findAll(@Req() req) {
    return this.epubService.read({ createdUserId: req.user.userId });
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.epubService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  async update(@Req() req, @Param('id') id: string, @Body() body: UpdateEpubDto) {
    return this.epubService.update(id, body, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req, @Param('id') id: string) {
    await this.epubService.delete(id, req.user.userId);
  }
}
