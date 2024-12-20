import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './firebase.service';
import { UploadFileDto } from './Dtos/file-upload.dto';

@Controller('api/files')
export class FileController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Body() { bucket_name, file_name }: UploadFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('File info: ', { bucket_name, file_name });

    const fileUrl = await this.fileUploadService.uploadFile(file);
    return { fileUrl };
  }

  @Post('hello')
  hello() {
    return 'hello';
  }
}
