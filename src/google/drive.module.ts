import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';

@Module({
  // imports: [ConfigModule.forRoot({ isGlobal: true, load: [googleConfig] })],
  providers: [DriveService],
  controllers: [DriveController],
  exports: [DriveService],
})
export class DriveModule {}
