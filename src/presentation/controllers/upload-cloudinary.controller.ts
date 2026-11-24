import {
  BadRequestException,
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
import { MAX_UPLOAD_BYTES } from 'src/shared/http/file-type';
import { clampPagination } from 'src/shared/http/pagination';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { UploadCloudinaryUseCase } from 'src/use-case/storage/upload-cloudinary.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/cloudinary')
export class UploadCloudinaryController {
  constructor(private readonly uploadCloudinary: UploadCloudinaryUseCase) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) throw new BadRequestException('No file provided');
    const url = await this.uploadCloudinary.upload(
      file,
      req.user.userId,
      'uploads',
    );
    return { url };
  }

  @Post('icon')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async uploadIcon(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) throw new BadRequestException('No file provided');
    const url = await this.uploadCloudinary.upload(
      file,
      req.user.userId,
      'icons',
    );
    return { url };
  }

  @Get('files')
  async listFiles(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pg = clampPagination(page, limit);
    return this.uploadCloudinary.listFiles(
      req.user.userId,
      'uploads',
      pg.page,
      pg.limit,
    );
  }

  @Get('icons')
  async listIcons(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pg = clampPagination(page, limit);
    return this.uploadCloudinary.listFiles(
      req.user.userId,
      'icons',
      pg.page,
      pg.limit,
    );
  }

  @Delete('files/*publicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('publicId') publicId: string | string[], @Req() req) {
    const id = Array.isArray(publicId) ? publicId.join('/') : publicId;
    await this.uploadCloudinary.deleteFile(id, req.user.userId, req.user.role);
  }
}
