import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './cache.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (!url) return null;
        const client = new Redis(url);
        // Bắt buộc có listener 'error': nếu không, ETIMEDOUT/reset từ Upstash
        // → 'Unhandled error event' và có thể crash process.
        const logger = new Logger('CacheRedis');
        client.on('error', (err) =>
          logger.error(`Redis error: ${err.message}`),
        );
        return client;
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
