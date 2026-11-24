import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './shared/security/jwt-auth.guard';
import { Roles } from './shared/security/roles.decorator';
import { RolesGuard } from './shared/security/roles.guard';

@Controller('/api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('/mongoose-status')
  getMongooseStatus(): object {
    return this.appService.checkMongooseStatus();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('/postgres-status')
  getPostgresStatus(): Promise<object> {
    return this.appService.checkPostgresStatus();
  }

  @Get('/health')
  health(): object {
    return { status: 'ok' };
  }
}
