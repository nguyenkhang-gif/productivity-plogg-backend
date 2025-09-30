import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DriveService } from './drive.service';

@Controller('api/drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('list')
  async list() {
    return await this.driveService.listFiles();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return await this.driveService.uploadFromBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }
}
