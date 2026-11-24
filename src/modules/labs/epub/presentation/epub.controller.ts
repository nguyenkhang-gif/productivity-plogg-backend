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
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { Epub } from 'src/modules/labs/epub/domain/epub.entity';
import { EpubService } from 'src/modules/labs/epub/infrastructure/epub.service';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';

class CreateEpubDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  sampleUrl?: string;

  @IsObject()
  properties: Record<string, any>;
}

class UpdateEpubDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  sampleUrl?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

/** Keeps the legacy Mongo-style `_id` next to `id` so clients keep working. */
const present = (epub: Epub) => ({ ...epub, _id: epub.id });

@UseGuards(JwtAuthGuard)
@Controller('api/epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}

  @Post()
  async create(@Req() req, @Body() body: CreateEpubDto) {
    return present(
      await this.epubService.create({
        ...body,
        createdUserId: req.user.userId,
      }),
    );
  }

  @Get()
  async findAll(@Req() req) {
    return (await this.epubService.findAll(req.user.userId)).map(present);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return present(await this.epubService.findOne(id, req.user.userId));
  }

  @Patch(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() body: UpdateEpubDto,
  ) {
    return present(await this.epubService.update(id, body, req.user.userId));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req, @Param('id') id: string) {
    await this.epubService.delete(id, req.user.userId);
  }
}
