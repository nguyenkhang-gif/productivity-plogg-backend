import { Injectable, Logger } from '@nestjs/common';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { unlink, readFile, mkdir, rm } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import * as os from 'os';
import { TranscriptionGateway } from './transcription.gateway';

const execFilePromise = promisify(execFile);

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  // Lấy cấu hình từ Docker Environment
  private readonly FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
  private readonly WHISPER = process.env.WHISPER_PATH || '/opt/whisper.cpp/build/bin/main';
  private readonly MODEL = process.env.MODEL_PATH || '/opt/whisper.cpp/models/ggml-base.bin';

  constructor(private readonly gateway: TranscriptionGateway) {}

  /**
   * Hàm chạy Whisper dùng spawn để bắt log thời gian thực
   */
  private runWhisper(args: string[], jobId: string, baseProgress: number, weight: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Executing: ${this.WHISPER} ${args.join(' ')}`);
      
      const child = spawn(this.WHISPER, args);

      // Whisper đẩy log (bao gồm tiến độ %) vào stderr
      child.stderr.on('data', (data) => {
        const line = data.toString();
        
        // Log ra console Docker để bạn debug
        if (line.trim()) {
          this.logger.debug(`[Whisper]: ${line.trim()}`);
        }

        // Bắt log tiến độ: "whisper_full: progress = 20%"
        if (line.includes('progress')) {
          const match = line.match(/progress\s*=\s*(\d+)%/);
          if (match) {
            const percent = parseInt(match[1], 10);
            // Tính toán progress tổng thể cho Gateway
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

      // 1. Trích xuất Audio (16kHz, Mono, PCM 16-bit)
      this.logger.log(`[Job ${jobId}] Step 1: Extracting audio...`);
      this.gateway.sendProgress(jobId, 'Extracting audio...', 5);
      await execFilePromise(this.FFMPEG, [
        '-y', '-i', inputVideoPath,
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
        fullAudioWav
      ]);

      // 2. Chia nhỏ audio (mỗi đoạn 5 phút)
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
        
        // Tính toán baseProgress cho từng chunk để gateway hiện mượt
        const baseProgressForThisChunk = 20 + (index / chunkFiles.length) * 75;
        const weightForThisChunk = 75 / chunkFiles.length;

        this.logger.log(`[Job ${jobId}] Step 3: Transcribing chunk ${index + 1}/${chunkFiles.length}`);

        const whisperArgs = [
          '--model', this.MODEL,
          '--language', 'en',
          '--file', chunkPath,
          '--output-txt',
          '--output-file', outputBase,
          '--print-progress' // Quan trọng để hiện %
        ];

        await this.runWhisper(whisperArgs, jobId, baseProgressForThisChunk, weightForThisChunk);

        const resultFile = `${outputBase}.txt`;
        if (existsSync(resultFile)) {
          const text = await readFile(resultFile, 'utf-8');
          finalTranscription += text.trim() + ' ';
        }
      }

      this.gateway.sendProgress(jobId, 'Completed', 100);
      return finalTranscription.trim();

    } catch (error) {
      this.logger.error(`[Job ${jobId}] Failed: ${error.message}`);
      this.gateway.sendProgress(jobId, 'Error processing video', 0);
      throw error;
    } finally {
      await this.cleanup(inputVideoPath, tempJobDir);
    }
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