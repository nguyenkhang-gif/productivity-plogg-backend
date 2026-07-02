import { createHmac, timingSafeEqual } from 'crypto';

const TTL_SECONDS = 5 * 60;

function secret() {
  return process.env.JWT_SECRET_KEY ?? 'fallback-secret';
}

export function signFileToken(
  bucket: string,
  userId: string,
  fileName: string,
): { sig: string; exp: number } {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${bucket}:${userId}:${fileName}:${exp}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('hex');
  return { sig, exp };
}

export function verifyFileToken(
  bucket: string,
  userId: string,
  fileName: string,
  sig: string,
  exp: number,
): boolean {
  if (Math.floor(Date.now() / 1000) > exp) return false;
  const payload = `${bucket}:${userId}:${fileName}:${exp}`;
  const expected = createHmac('sha256', secret()).update(payload).digest('hex');
  // timingSafeEqual để tránh timing attack
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
