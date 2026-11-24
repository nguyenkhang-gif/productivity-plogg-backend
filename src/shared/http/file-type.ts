import { BadRequestException } from '@nestjs/common';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface DetectedImageType {
  mime: string;
  ext: string;
}

export function detectImageType(
  buffer: Buffer | undefined | null,
): DetectedImageType | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { mime: 'image/gif', ext: 'gif' };
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

export function requireImageType(
  file: Express.Multer.File | undefined | null,
): DetectedImageType {
  const detected = detectImageType(file?.buffer);
  if (!detected) {
    throw new BadRequestException(
      'Unsupported file type. Allowed: JPEG, PNG, GIF, WEBP',
    );
  }
  return detected;
}
