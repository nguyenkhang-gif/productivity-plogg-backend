import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderChannelsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds: string[];
}
