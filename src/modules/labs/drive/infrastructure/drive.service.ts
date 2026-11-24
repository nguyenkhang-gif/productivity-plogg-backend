import { google, drive_v3 } from 'googleapis';
import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs';
import { Readable } from 'stream';
import { Workbook, CellValue } from 'exceljs';

@Injectable()
export class DriveService implements OnModuleInit {
  private driveClient: drive_v3.Drive;
  private readonly folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  private readonly logger = new Logger(DriveService.name);

  async assertFileInFolder(fileId: string) {
    let parents: string[] | null | undefined;
    try {
      const res = await this.driveClient.files.get({
        fileId,
        fields: 'parents',
        supportsAllDrives: true,
      });
      parents = res.data.parents;
    } catch (error) {
      this.logger.error(`Drive lookup failed: ${error.message}`);
      throw new ForbiddenException('File not accessible');
    }
    if (!this.folderId || !parents || !parents.includes(this.folderId)) {
      throw new ForbiddenException('File not accessible');
    }
  }

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
    await this.assertFileInFolder(fileId);
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
    await this.assertFileInFolder(fileId);
    try {
      // Tải file Excel dưới dạng Buffer
      const buffer = await this.downloadFileAsBuffer(fileId);

      const workbook = new Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

      const jsonData: { [sheet: string]: unknown[][] } = {};
      workbook.eachSheet((worksheet) => {
        const rows: unknown[][] = [];
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const values = (row.values as CellValue[]).slice(1);
          rows[rowNumber - 1] = values.map((v) => toPlainCellValue(v));
        });
        jsonData[worksheet.name] = Array.from(rows, (r) => r ?? []);
      });

      return jsonData;
    } catch (error) {
      throw new Error(
        `Không thể chuyển file Excel sang JSON: ${error.message}`,
      );
    }
  }
  async convertJsonToXlsxBuffer(
    jsonData: Record<string, unknown[][]>,
  ): Promise<Buffer> {
    try {
      const workbook = new Workbook();
      for (const sheetName of Object.keys(jsonData)) {
        workbook.addWorksheet(sheetName).addRows(jsonData[sheetName] ?? []);
      }
      return Buffer.from(await workbook.xlsx.writeBuffer());
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
    await this.assertFileInFolder(fileId);
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

function toPlainCellValue(value: CellValue | undefined): unknown {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date || typeof value !== 'object') return value;
  if ('result' in value) return value.result;
  if ('richText' in value) return value.richText.map((t) => t.text).join('');
  if ('text' in value) return value.text;
  if ('error' in value) return value.error;
  return undefined;
}
