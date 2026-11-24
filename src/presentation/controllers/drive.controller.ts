import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DriveService } from 'src/infrastructure/google/drive.service';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { RolesGuard } from 'src/presentation/guards/roles.guard';
import { Roles } from 'src/presentation/decorators/roles.decorator';
import { MAX_UPLOAD_BYTES } from 'src/shared/http/file-type';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/drive')
export class DriveController {
  private readonly logger = new Logger(DriveController.name);

  constructor(private readonly driveService: DriveService) {}

  private fail(res, err: unknown) {
    if (err instanceof ForbiddenException) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ error: 'File not accessible' });
    }
    if (err instanceof HttpException) {
      return res
        .status(err.getStatus())
        .json({ error: 'Request could not be processed' });
    }
    this.logger.error((err as Error)?.message ?? 'Drive operation failed');
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: 'Drive operation failed' });
  }

  @Get('list')
  async list() {
    return await this.driveService.listFiles();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Res() res) {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }
      const result = await this.driveService.uploadFromBuffer(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      return res.status(HttpStatus.CREATED).json(result);
    } catch (err) {
      return this.fail(res, err);
    }
  }

  @Get('download/:fileId')
  async downloadFile(@Param('fileId') fileId: string, @Res() res) {
    try {
      const buffer = await this.driveService.convertExcelToJson(fileId);
      return res.status(HttpStatus.OK).send(buffer);
    } catch (err) {
      return this.fail(res, err);
    }
  }

  @Post('overwrite/:fileId')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async overwriteFile(
    @Param('fileId') fileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }
      const result = await this.driveService.overwriteFileFromBuffer(
        fileId,
        file.buffer,
        file.mimetype,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (err) {
      return this.fail(res, err);
    }
  }
}
