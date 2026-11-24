import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
import { DriveService } from './infrastructure/drive.service';
import { DriveController } from 'src/modules/labs/drive/presentation/drive.controller';

@Module({
  // imports: [ConfigModule.forRoot({ isGlobal: true, load: [googleConfig] })],
  providers: [DriveService],
  controllers: [DriveController],
  exports: [DriveService],
})
export class DriveModule {}
