import { google, drive_v3 } from 'googleapis';
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

@Injectable()
export class DriveService implements OnModuleInit {
  private driveClient: drive_v3.Drive;
  private readonly folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

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
      fields: 'nextPageToken, files(id, name, mimeType, owners,webViewLink)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 100,
    });

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

  async downloadFileAsBuffer(fileId: string): Promise<Buffer> {
    try {
      const res = await this.driveClient.files.get(
        {
          fileId,
          alt: 'media',
          supportsAllDrives: true,
        },
        { responseType: 'stream' },
      );

      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        res.data
          .on('data', (chunk) => {
            chunks.push(Buffer.from(chunk));
          })
          .on('error', (err) => {
            reject(new Error(`Lỗi khi tải file: ${err.message}`));
          })
          .on('end', () => {
            resolve(Buffer.concat(chunks));
          });
      });
    } catch (error) {
      throw new Error(`Không thể tải file: ${error.message}`);
    }
  }

  async convertExcelToJson(fileId: string): Promise<any> {
    try {
      // Tải file Excel dưới dạng Buffer
      const buffer = await this.downloadFileAsBuffer(fileId);

      // Đọc file Excel từ Buffer
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Lấy danh sách các sheet
      const sheetNames = workbook.SheetNames;

      // Chuyển tất cả sheet thành JSON
      const jsonData: { [sheet: string]: any[] } = {};
      sheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        jsonData[sheetName] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });
      });

      return jsonData;
    } catch (error) {
      throw new Error(
        `Không thể chuyển file Excel sang JSON: ${error.message}`,
      );
    }
  }
  convertJsonToXlsxBuffer(jsonData: any[], sheetName: string): Promise<Buffer> {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Iterate over each sheet in the JSON data
      Object.keys(jsonData).forEach((sheetName) => {
        // Convert the array of arrays to a worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(jsonData[sheetName]);
        // Append the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Write the workbook to a buffer
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      return buffer;
    } catch (error) {
      throw new Error(
        `Không thể chuyển đổi JSON sang buffer XLSX: ${error.message}`,
      );
    }
  }

  async overwriteFileFromBuffer(
    fileId: string,
    buffer: Buffer,
    mimeType: string,
  ) {
    try {
      // Tạo Readable stream từ Buffer
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata: drive_v3.Schema$File = {
        // Có thể cập nhật metadata nếu cần, ví dụ: name
        // name: newFileName,
      };

      const media = {
        mimeType,
        body: stream,
      };

      const res = await this.driveClient.files.update({
        fileId, // ID của file cần ghi đè
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink',
        supportsAllDrives: true, // Hỗ trợ Shared Drives nếu cần
      });

      return res.data;
    } catch (error) {
      throw new Error(`Không thể ghi đè file từ buffer: ${error.message}`);
    }
  }
}
