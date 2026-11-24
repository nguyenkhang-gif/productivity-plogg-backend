import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { resolveStorageRoot } from 'src/modules/media/storage/infrastructure/local-storage.repository';
import { verifyFileToken } from 'src/modules/media/storage/infrastructure/file-token.util';

const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const ALLOWED_BUCKETS = ['upload', 'icons'] as const;

@Controller('files')
export class LocalFilePublicController {
  @Get(':bucket/:userId/:fileName')
  async serveFile(
    @Param('bucket') bucket: string,
    @Param('userId') userId: string,
    @Param('fileName') fileName: string,
    @Query('sig') sig: string,
    @Query('exp') exp: string,
    @Res() res: Response,
  ) {
    if (!ALLOWED_BUCKETS.includes(bucket as any)) throw new NotFoundException();

    const expNum = parseInt(exp, 10);
    const safeName = path.basename(fileName);

    if (
      !sig ||
      !exp ||
      isNaN(expNum) ||
      !verifyFileToken(bucket, userId, safeName, sig, expNum)
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const root = path.resolve(await resolveStorageRoot());
    const filePath = path.resolve(root, bucket, userId, safeName);
    if (!filePath.startsWith(root + path.sep)) {
      throw new NotFoundException('File not found');
    }

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found');
    }

    const mime = IMAGE_TYPES[path.extname(safeName).toLowerCase()];
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (mime) {
      res.setHeader('Content-Type', mime);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
    }

    res.sendFile(filePath);
  }
}
