import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } }) // Cho phép FE kết nối
export class TranscriptionGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log(`Client connected: ${client.id}`);
  }

  // Hàm helper để gửi tiến độ
  sendProgress(jobId: string, status: string, percent: number) {
    this.server.emit('transcriptionProgress', { jobId, status, percent });
  }
}