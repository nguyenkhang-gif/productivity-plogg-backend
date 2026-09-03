import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('/api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/mongoose-status')
  getMongooseStatus(): Promise<object> {
    return this.appService.checkMongooseStatus();
  }

  @Get('/postgres-status')
  getPostgresStatus(): Promise<object> {
    return this.appService.checkPostgresStatus();
  }

  @Get('/health')
  health(): object {
    return { status: 'ok' };
  }

  /** Tạm — đo round-trip tới Redis/Mongo/Postgres từ chính server. Xoá sau khi đo. */
  @Get('/ping-deps')
  pingDeps(): Promise<object> {
    return this.appService.pingDeps();
  }
}
