import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PrismaService } from './shared/database/prisma.service';

const MONGO_STATES: Record<number, string> = {
  0: 'Disconnected',
  1: 'Connected',
  2: 'Connecting',
  3: 'Disconnecting',
};

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectConnection() private readonly mongo: Connection,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkPostgresStatus(): Promise<object> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'Connected' };
    } catch {
      return { status: 'Disconnected' };
    }
  }

  checkMongooseStatus(): object {
    return { status: MONGO_STATES[this.mongo.readyState] ?? 'Unknown' };
  }
}
