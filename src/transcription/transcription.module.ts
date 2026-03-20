import { Module } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { TranscriptionGateway } from './transcription.gateway';
import { Transcription, TranscriptionSchema } from './schema/transcription.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([{ name: Transcription.name, schema: TranscriptionSchema }])],
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionGateway],
})
export class TranscriptionModule {}