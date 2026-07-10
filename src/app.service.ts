import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { PrismaService } from './infrastructure/databases/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

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
