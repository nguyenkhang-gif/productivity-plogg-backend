import { Controller, Get, NotFoundException, Param, Query, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { resolveStorageRoot } from 'src/infrastructure/storage/local-storage.repository';
import { verifyFileToken } from 'src/infrastructure/storage/file-token.util';

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

    if (!sig || !exp || isNaN(expNum) || !verifyFileToken(bucket, userId, safeName, sig, expNum)) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const root = await resolveStorageRoot();
    const filePath = path.join(root, bucket, userId, safeName);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found');
    }

    res.sendFile(filePath);
  }
}
