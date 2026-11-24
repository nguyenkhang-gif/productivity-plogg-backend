import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class GuildRealtimeService {
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  getServer(): Server | undefined {
    return this.server;
  }
}
