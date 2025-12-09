import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
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
  async uploadFile(@UploadedFile() file: Express.Multer.File,@Res() res) {
    try {
      if(!file){

        throw new Error("No file provided");
      }
      return await this.driveService.uploadFromBuffer(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message });//message
    }
  }




  @Get('download/:fileId')
  async downloadFile(@Param('fileId') fileId: string, @Res() res) {
    try {
      
      const buffer = await this.driveService.convertExcelToJson(fileId);
      // res.set({
      //   'Content-Type':
      //     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      //   'Content-Disposition': `attachment; filename="downloaded_file.xlsx"`,
      // });
      res.send(buffer);
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message });
    }
  }


  @Post('overwrite/:fileId')
  @UseInterceptors(FileInterceptor('file'))
  async overwriteFile(
    @Param('fileId') fileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res
  ) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      const result = await this.driveService.overwriteFileFromBuffer(
        fileId,
        file.buffer,
        file.mimetype
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message });
    }
  }



  
}
