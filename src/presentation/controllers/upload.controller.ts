import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { UploadFileUseCase } from 'src/use-case/storage/upload-file.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadFile: UploadFileUseCase) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) return { message: 'No file provided' };
    const publicUrl = await this.uploadFile.execute(file, req.user.userId, 'upload');
    return { publicUrl };
  }

  @Post('icon')
  @UseInterceptors(FileInterceptor('file'))
  async uploadIcon(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) return { message: 'No file provided' };
    const publicUrl = await this.uploadFile.execute(file, req.user.userId, 'icons');
    return { publicUrl };
  }

  @Get('files')
  async listFiles(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.uploadFile.listFiles(req.user.userId, 'upload', +page, +limit);
  }

  @Get('icons')
  async listIcons(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.uploadFile.listFiles(req.user.userId, 'icons', +page, +limit);
  }

  @Delete('files/:fileName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('fileName') fileName: string, @Req() req) {
    await this.uploadFile.deleteFile(fileName, req.user.userId, 'upload');
  }

  @Delete('icons/:fileName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIcon(@Param('fileName') fileName: string, @Req() req) {
    await this.uploadFile.deleteFile(fileName, req.user.userId, 'icons');
  }
}
