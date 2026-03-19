import { Module } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { TranscriptionGateway } from './transcription.gateway';

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionGateway],
})
export class TranscriptionModule {}