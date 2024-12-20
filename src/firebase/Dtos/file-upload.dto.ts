import { IsNotEmpty } from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty()
  bucket_name: string;

  @IsNotEmpty()
  file_name: string;
}
