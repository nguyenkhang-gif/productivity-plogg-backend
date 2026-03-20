import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { unlink, readFile, mkdir, rm } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import * as os from 'os';
import { TranscriptionGateway } from './transcription.gateway';
import { Transcription, TranscriptionDocument } from './schema/transcription.schema';

const execFilePromise = promisify(execFile);

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  // 1. CHỈNH SỬA: Ưu tiên lấy từ ENV, nếu không có sẽ trỏ về file ggml-tiny.bin
  private readonly FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
  private readonly WHISPER = process.env.WHISPER_PATH || '/opt/whisper.cpp/build/bin/main';
  
  // Đổi mặc định từ base.bin sang tiny.bin
  private readonly MODEL = process.env.MODEL_PATH || '/opt/whisper.cpp/models/ggml-tiny.bin';
  
  // Thêm cấu hình Threads (Tận dụng CPU đa nhân)
  private readonly THREADS = process.env.WHISPER_THREADS || '4';

  constructor(
    private readonly gateway: TranscriptionGateway,
    @InjectModel(Transcription.name) private transcriptionModel: Model<TranscriptionDocument>,
  ) {}

  /**
   * Hàm chạy Whisper dùng spawn để bắt log thời gian thực
   */
  private runWhisper(args: string[], jobId: string, baseProgress: number, weight: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Executing: ${this.WHISPER} ${args.join(' ')}`);
      
      const child = spawn(this.WHISPER, args);

      child.stderr.on('data', (data) => {
        const line = data.toString();
        
        if (line.trim()) {
          // Log này giúp bạn theo dõi Whisper đang làm gì
          this.logger.debug(`[Whisper]: ${line.trim()}`);
        }

        if (line.includes('progress')) {
          const match = line.match(/progress\s*=\s*(\d+)%/);
          if (match) {
            const percent = parseInt(match[1], 10);
            const currentTotalProgress = Math.round(baseProgress + (percent * weight / 100));
            this.gateway.sendProgress(jobId, `Transcribing... ${percent}%`, currentTotalProgress);
          }
        }
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Whisper process exited with code ${code}`));
      });

      child.on('error', (err) => {
        this.logger.error(`Spawn error: ${err.message}`);
        reject(err);
      });
    });
  }

  async processLargeVideo(file: Express.Multer.File, jobId: string): Promise<string> {
    const tempJobDir = path.join(os.tmpdir(), jobId);
    const inputVideoPath = file.path;
  
    try {
      await mkdir(tempJobDir, { recursive: true });
      const chunksDir = path.join(tempJobDir, 'chunks');
      await mkdir(chunksDir, { recursive: true });
      const fullAudioWav = path.join(tempJobDir, 'full_audio.wav');
  
      // 1. Trích xuất Audio (Chuẩn hóa về 16kHz Mono cho Whisper)
      this.logger.log(`[Job ${jobId}] Step 1: Extracting audio...`);
      this.gateway.sendProgress(jobId, 'Extracting audio...', 5);
      await execFilePromise(this.FFMPEG, [
        '-y', '-i', inputVideoPath,
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
        fullAudioWav
      ]);
  
      // 2. Chia nhỏ audio (Mỗi chunk 5 phút để tránh tràn RAM)
      this.logger.log(`[Job ${jobId}] Step 2: Splitting audio...`);
      this.gateway.sendProgress(jobId, 'Splitting audio...', 15);
      await execFilePromise(this.FFMPEG, [
        '-i', fullAudioWav,
        '-f', 'segment', '-segment_time', '300', '-c', 'copy',
        path.join(chunksDir, 'chunk_%03d.wav')
      ]);
  
      const chunkFiles = readdirSync(chunksDir).filter(f => f.endsWith('.wav')).sort();
      let finalTranscription = '';
  
      // 3. Xử lý từng đoạn bằng Whisper
      for (const [index, chunkFile] of chunkFiles.entries()) {
        const chunkPath = path.join(chunksDir, chunkFile);
        const outputBase = path.join(chunksDir, `trans_${index}`);
        
        const baseProgressForThisChunk = 20 + (index / chunkFiles.length) * 75;
        const weightForThisChunk = 75 / chunkFiles.length;
  
        this.logger.log(`[Job ${jobId}] Step 3: Transcribing chunk ${index + 1}/${chunkFiles.length}`);
  
        // 2. CHỈNH SỬA: Cấu hình tham số cho Whisper
        const whisperArgs = [
          '--model', this.MODEL,
          '--threads', this.THREADS, // Thêm threads để chạy nhanh hơn
          '--language', 'en',       // Nếu video tiếng Việt, hãy đổi thành 'vi' hoặc 'auto'
          '--file', chunkPath,
          '--output-txt',
          '--output-file', outputBase,
          '--print-progress'
        ];
  
        await this.runWhisper(whisperArgs, jobId, baseProgressForThisChunk, weightForThisChunk);
  
        const resultFile = `${outputBase}.txt`;
        if (existsSync(resultFile)) {
          const text = await readFile(resultFile, 'utf-8');
          const chunkText = text.trim();
          finalTranscription += chunkText + ' ';
  
          // LƯU TỪNG CHUNK VÀO DB
          await this.transcriptionModel.create({
            jobId,
            content: chunkText,
            fileName: file.originalname,
            chunkIndex: index,
            status: 'completed'
          });
        }
      }
  
      this.gateway.sendProgress(jobId, 'Completed', 100);
      return finalTranscription.trim();
  
    } catch (error) {
      this.logger.error(`[Job ${jobId}] Failed: ${error.message}`);
      
      await this.transcriptionModel.create({ 
        jobId, 
        status: 'error',
        fileName: file.originalname,
        content: error.message 
      });
  
      this.gateway.sendProgress(jobId, 'Error processing video', 0);
      throw error;
    } finally {
      await this.cleanup(inputVideoPath, tempJobDir);
    }
  }

  async getCombinedContentByJobId(jobId: string): Promise<any> {
    const chunks = await this.transcriptionModel
      .find({ jobId })
      .sort({ chunkIndex: 1, createdAt: 1 })
      .exec();
  
    if (!chunks || chunks.length === 0) return null;
  
    const fullContent = chunks
      .map(chunk => chunk.content)
      .filter(content => content)
      .join(' ')
      .trim();
  
    const lastRecord = chunks[chunks.length - 1];
  
    return {
      jobId: jobId,
      fileName: chunks[0].fileName,
      status: chunks.some(c => c.status === 'error') ? 'error' : lastRecord.status, 
      totalChunks: chunks.length,
      combinedContent: fullContent,
      lastUpdated: lastRecord['updatedAt'] || lastRecord['createdAt']
    };
  }

  private async cleanup(videoPath: string, jobDir: string) {
    try {
      if (existsSync(videoPath)) await unlink(videoPath);
      if (existsSync(jobDir)) await rm(jobDir, { recursive: true, force: true });
      this.logger.log(`Cleanup temporary files done.`);
    } catch (err) {
      this.logger.warn(`Cleanup error: ${err.message}`);
    }
  }
}