import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Epub, EpubSchema } from 'src/infrastructure/databases/schemas/epub.schema';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { FileUploadService } from 'src/firebase/firebase.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MongoEpubRepository } from 'src/infrastructure/databases/repositories/epub.repository';
import { EPUB_REPOSITORY } from 'src/core/domain/repositories/epub.repository.interface';
import { EpubService } from './epub.service';
import { EpubController } from 'src/presentation/controllers/epub.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Epub.name, schema: EpubSchema }]),
    FirebaseModule,
  ],
  providers: [
    EpubService,
    FileUploadService,
    SupabaseService,
    { provide: EPUB_REPOSITORY, useClass: MongoEpubRepository },
  ],
  controllers: [EpubController],
  exports: [EpubService],
})
export class EpubModule {}
