import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FileUploadService {
  private storage: admin.storage.Storage;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: admin.app.App) {
    this.storage = this.firebaseApp.storage();
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      const bucket = this.storage.bucket();
      console.log('file info', bucket);

      const fileRef = bucket.file(`files/${file.originalname}`);

      console.log('Uploading the file...', fileRef);

      // Lưu file vào bucket
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      console.log('File uploaded successfully.');

      await fileRef.makePublic();

      return fileRef.publicUrl();
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
}
