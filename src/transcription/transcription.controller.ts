import { 
  Controller, Post, UseInterceptors, UploadedFile, 
  HttpException, HttpStatus, Body 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TranscriptionService } from './transcription.service';
import { existsSync, mkdirSync } from 'fs';

const uploadDir = './temp_uploads';
if (!existsSync(uploadDir)) mkdirSync(uploadDir);

@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post('convert')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `video-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB
    }),
  )
  async uploadAndTranscribe(
    @UploadedFile() file: Express.Multer.File,
    @Body('jobId') jobId: string, // Nhận ID từ Frontend để đồng bộ Socket
  ) {
    if (!file) throw new HttpException('File not found', HttpStatus.BAD_REQUEST);
    
    try {
      const result = await this.transcriptionService.processLargeVideo(file, jobId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}