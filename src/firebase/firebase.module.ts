import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FileController } from './firebase.controller';
import { FileUploadService } from './firebase.service';
// import { getStorage } from 'firebase/storage';

let firebaseApp = null;
const firebaseProvider = {
  provide: 'FIREBASE_APP',
  inject: [ConfigService],
  useFactory: () => {
    const firebaseConfig = {
      type: process.env.FBType,
      project_id: process.env.FBprojectId,
      private_key_id: process.env.FBprivate_key_id,
      private_key:
        `-----BEGIN PRIVATE KEY-----\n${process.env.FBprivate_key}==\n-----END PRIVATE KEY-----\n`?.replace(
          /\\n/g,
          '\n',
        ),
      client_email: process.env.FBclient_email,
      client_id: process.env.FBclient_id,
      auth_uri: process.env.FBauth_uri,
      token_uri: process.env.FBtoken_uri,
      auth_provider_x509_cert_url: process.env.FBauth_provider_x509_cert_url,
      client_x509_cert_url: process.env.FBauth_provider_x509_cert_url,
      universe_domain: process.env.FBuniverse_domain,
    } as admin.ServiceAccount;

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      storageBucket: `${process.env.FBstorageBucketAlt}`,
      // storageBucket: `gs://productivity-blog-a.appspot.com`,
    });
    if (!admin.apps.length) {
      console.error('Firebase app has not been initialized.');
    } else {
      console.log('Firebase app is initialized:', firebaseApp.name);
    }

    return firebaseApp;
  },
};
// console.log("provider",getStorage(firebaseApp));

@Module({
  imports: [ConfigModule],
  controllers: [FileController],
  providers: [firebaseProvider, FileUploadService],
  exports: ['FIREBASE_APP'],
})
export class FirebaseModule {}
