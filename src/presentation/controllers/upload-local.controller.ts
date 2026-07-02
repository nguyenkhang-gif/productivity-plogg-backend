import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { UploadLocalUseCase } from 'src/use-case/storage/upload-local.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/local')
export class UploadLocalController {
  constructor(private readonly uploadLocal: UploadLocalUseCase) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) return { message: 'No file provided' };
    const publicUrl = await this.uploadLocal.execute(
      file,
      req.user.userId,
      'upload',
    );
    return { publicUrl };
  }

  @Post('icon')
  @UseInterceptors(FileInterceptor('file'))
  async uploadIcon(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) return { message: 'No file provided' };
    const publicUrl = await this.uploadLocal.execute(
      file,
      req.user.userId,
      'icons',
    );
    return { publicUrl };
  }

  @Get('files')
  async listFiles(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('path') subPath = '',
  ) {
    return this.uploadLocal.listFiles(
      req.user.userId,
      'upload',
      +page,
      +limit,
      subPath,
    );
  }

  @Get('icons')
  async listIcons(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('path') subPath = '',
  ) {
    return this.uploadLocal.listFiles(
      req.user.userId,
      'icons',
      +page,
      +limit,
      subPath,
    );
  }

  @Delete('files/:fileName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('fileName') fileName: string, @Req() req) {
    await this.uploadLocal.deleteFile(
      path.basename(fileName),
      req.user.userId,
      'upload',
    );
  }

  @Delete('icons/:fileName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIcon(@Param('fileName') fileName: string, @Req() req) {
    await this.uploadLocal.deleteFile(
      path.basename(fileName),
      req.user.userId,
      'icons',
    );
  }
}
