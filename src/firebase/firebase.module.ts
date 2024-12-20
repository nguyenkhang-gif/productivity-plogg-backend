import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FileUploadService } from './firebase.service';
import { FileController } from './firebase.controller';
// import { getStorage } from 'firebase/storage';

let firebaseApp = null;
const firebaseProvider = {
  provide: 'FIREBASE_APP',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const firebaseConfig = {
      type: configService.get<string>('FBType'),
      project_id: configService.get<string>('FBprojectId'),
      private_key_id: configService.get<string>('FBprivate_key_id'),
      private_key:
        `-----BEGIN PRIVATE KEY-----\n${configService.get<string>('FBprivate_key')}==\n-----END PRIVATE KEY-----\n`?.replace(
          /\\n/g,
          '\n',
        ),
      client_email: configService.get<string>('FBclient_email'),
      client_id: configService.get<string>('FBclient_id'),
      auth_uri: configService.get<string>('FBauth_uri'),
      token_uri: configService.get<string>('FBtoken_uri'),
      auth_provider_x509_cert_url: configService.get<string>(
        'FBauth_provider_x509_cert_url',
      ),
      client_x509_cert_url: configService.get<string>(
        'FBauth_provider_x509_cert_url',
      ),
      universe_domain: configService.get<string>('FBuniverse_domain'),
    } as admin.ServiceAccount;

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: `https://${configService.get<string>('FBprojectId')}.firebaseio.com`,
      storageBucket: `${configService.get<string>('FBbucketname')}`,
    });
    console.log("firebase app initialized");
    
    return firebaseApp;
  },
};
// console.log("provider",getStorage(firebaseApp));

@Module({
  imports: [ConfigModule],
  controllers: [FileController],
  providers: [firebaseProvider, FileUploadService],
  exports: [],
})
export class FirebaseModule {}
