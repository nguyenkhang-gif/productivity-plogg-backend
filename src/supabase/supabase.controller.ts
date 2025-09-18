import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseService } from './supabase.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('api/supabase')
export class SupabaseController {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Upload file và trả về public URL
   * POST /supabase/upload
   * Body: form-data, key = file
   */
  @UseGuards(AuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const { user } = req;
    console.log(req.user);

    if (!file) return { message: 'No file uploaded' };

    const bucket =  process.env.SUPABASE_BUCKET_NAME; // Tên bucket đã tạo trong Supabase
    const filePath = `uploads/${user ? user.userId : 'random'}/${Date.now()}-${file.originalname}`;

    const result = await this.supabaseService.uploadFile(
      bucket,
      filePath,
      file.buffer,
      file.mimetype,
    );

    const publicUrl = this.supabaseService.getPublicUrl(bucket, filePath);

    return {
      path: result.path,
      publicUrl,
    };
  }

  /**
   * Tạo signed URL (nếu bucket private)
   * GET /supabase/signed-url?path=uploads/abc.png
   */
  //   @Get('signed-url')
  //   async signedUrl(@Query('path') path: string) {
  //     const bucket = 'my-files';
  //     const { data, error } = await this.supabaseService.client.storage
  //       .from(bucket)
  //       .createSignedUrl(path, 60); // URL sống 60 giây
  //     if (error) throw new Error(error.message);
  //     return { signedUrl: data.signedUrl };
  //   }
  @UseGuards(AuthGuard)
  @Get('my-files')
  async getMyFiles(@Req() req) {
    const { user } = req;
    const bucket = process.env.SUPABASE_BUCKET_NAME;
    const folder = `uploads/${user.userId}`;

    const filesData = await this.supabaseService.listUserFiles(bucket, folder);

    const files = filesData.map((f) => ({
      name: f.name,
      publicUrl: this.supabaseService.getPublicUrl(
        bucket,
        `${folder}/${f.name}`,
      ),
      ...f, // metadata size, updated_at...
    }));

    return { folder, files };
  }
}
