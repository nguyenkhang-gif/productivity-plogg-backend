import { BadRequestException } from '@nestjs/common';
import { detectImageType, requireImageType } from './file-type';
import { clampPagination } from './pagination';
import { escapeRegex } from './regex';

const pad = (head: number[], len = 32) =>
  Buffer.concat([Buffer.from(head), Buffer.alloc(len)]);

describe('detectImageType', () => {
  it('detects jpeg', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
  });

  it('detects png', () => {
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47]))?.mime).toBe(
      'image/png',
    );
  });

  it('detects gif', () => {
    expect(detectImageType(pad([0x47, 0x49, 0x46, 0x38]))?.ext).toBe('gif');
  });

  it('detects webp', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.alloc(4),
      Buffer.from('WEBP'),
      Buffer.alloc(8),
    ]);
    expect(detectImageType(buf)?.mime).toBe('image/webp');
  });

  it('rejects RIFF that is not webp', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.alloc(4),
      Buffer.from('WAVE'),
      Buffer.alloc(8),
    ]);
    expect(detectImageType(buf)).toBeNull();
  });

  it('rejects svg and html', () => {
    expect(
      detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).toBeNull();
    expect(
      detectImageType(Buffer.from('<html><script>alert(1)</script></html>')),
    ).toBeNull();
  });

  it('rejects empty or missing buffers', () => {
    expect(detectImageType(undefined)).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });

  it('requireImageType throws for spoofed mimetype', () => {
    const file = {
      originalname: 'x.png',
      mimetype: 'image/png',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    } as Express.Multer.File;
    expect(() => requireImageType(file)).toThrow(BadRequestException);
  });
});

describe('clampPagination', () => {
  it('clamps limit and page', () => {
    expect(clampPagination('-3', '99999')).toEqual({ page: 1, limit: 50 });
    expect(clampPagination('abc', 'abc')).toEqual({ page: 1, limit: 20 });
    expect(clampPagination(2, 10)).toEqual({ page: 2, limit: 10 });
  });
});

describe('escapeRegex', () => {
  it('escapes metacharacters and caps length', () => {
    expect(escapeRegex('a.*(b)')).toBe('a\\.\\*\\(b\\)');
    expect(escapeRegex('x'.repeat(500))).toHaveLength(100);
  });
});
