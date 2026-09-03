import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { PrismaService } from './infrastructure/databases/prisma/prisma.service';
import { CacheService } from './infrastructure/cache/cache.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkPostgresStatus(): Promise<object> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'Connected' };
    } catch (err) {
      return { status: 'Disconnected', error: (err as Error).message };
    }
  }

  /**
   * Đo round-trip tới từng dependency, ĐO TỪ CHÍNH SERVER đang chạy.
   *
   * Mọi quyết định về kiến trúc cache phụ thuộc con số này: nếu Redis ~1ms thì
   * chia nhiều round-trip là miễn phí (mẫu Facebook/Twitter dùng được); nếu
   * ~50ms thì mỗi lần chia truy vấn là cộng thêm 50ms.
   *
   * Endpoint tạm — xoá sau khi đã đo xong.
   */
  async pingDeps(): Promise<object> {
    const measure = async (fn: () => Promise<unknown>) => {
      const samples: number[] = [];
      try {
        await fn(); // warm-up, không tính
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          await fn();
          samples.push(Date.now() - start);
        }
      } catch (err) {
        return { error: (err as Error).message };
      }
      samples.sort((a, b) => a - b);
      return { medianMs: samples[2], samples };
    };

    const [redis, mongo, postgres] = await Promise.all([
      measure(() => this.cache.get('__ping__')),
      measure(() => mongoose.connection.db.admin().ping()),
      measure(() => this.prisma.$queryRaw`SELECT 1`),
    ]);

    return { redis, mongo, postgres, redisEnabled: !!process.env.REDIS_URL };
  }

  async checkMongooseStatus(): Promise<object> {
    const state = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
    };

    const connectionState = mongoose.connection.readyState;
    return {
      status: state[connectionState],
      connectionString: process.env.MONGO_DB_URI,
    };
  }
}
