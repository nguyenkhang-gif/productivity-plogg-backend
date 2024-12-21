import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
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
