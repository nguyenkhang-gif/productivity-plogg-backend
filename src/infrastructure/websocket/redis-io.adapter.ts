import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);

  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL chưa set — chạy single-instance.');
      return;
    }

    this.pubClient = new Redis(url);
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (err) => {
      this.logger.error(`Redis pubClient error: ${err.message}`);
    });

    this.subClient.on('error', (err) =>
      this.logger.error(`Redis subClient error: ${err.message}`),
    );

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        this.pubClient.once('ready', resolve);
        this.pubClient.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        this.subClient.once('ready', resolve);
        this.subClient.once('error', reject);
      }),
    ]);

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('Redis Adapter kết nối thành công.');
  }

  async closeRedis(): Promise<void> {
    await Promise.allSettled([
      this.closeClient(this.pubClient),
      this.closeClient(this.subClient),
    ]);
  }

  /**
   * Đóng an toàn: chỉ `quit()` khi client đang 'ready'. Nếu connection đã
   * đóng/timeout (vd Upstash ETIMEDOUT), `quit()` sẽ ném 'Connection is closed'
   * qua event async → dùng `disconnect()` (đồng bộ, không ném) thay thế.
   */
  private async closeClient(client?: Redis): Promise<void> {
    if (!client) return;
    try {
      if (client.status === 'ready') {
        await client.quit();
      } else {
        client.disconnect();
      }
    } catch (err) {
      this.logger.warn(
        `Bỏ qua lỗi khi đóng Redis: ${(err as Error).message}`,
      );
      client.disconnect();
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
