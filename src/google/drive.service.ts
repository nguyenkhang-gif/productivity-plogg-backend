import { google, drive_v3 } from 'googleapis';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { Readable } from 'stream';

@Injectable()
export class DriveService implements OnModuleInit {
  private driveClient: drive_v3.Drive;
  private readonly folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    );

    // 👉 Set refresh token
    oAuth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    });

    this.driveClient = google.drive({
      version: 'v3',
      auth: oAuth2Client,
    });
  }

  async listFiles() {
    const res = await this.driveClient.files.list({
      q: `'${this.folderId}' in parents`,
      fields: 'nextPageToken, files(id, name, mimeType, owners)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 100,
    });
    // const res_2 = await this.driveClient.files.list({
    //   q: `'${this.folderId}' in parents`,
    //   fields: 'files(id, name, parents, owners)',
    // });
    // console.log(res_2.data.files);
    return res.data.files;
  }

  async uploadFile(filePath: string, fileName: string, mimeType: string) {
    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [this.folderId],
    };
    const media = { mimeType, body: fs.createReadStream(filePath) };

    const res = await this.driveClient.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    return res.data;
  }

  async uploadFromBuffer(buffer: Buffer, fileName: string, mimeType: string) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [this.folderId],
    };

    const media = { mimeType, body: stream };

    const res = await this.driveClient.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    return res.data;
  }
}
