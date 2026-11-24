import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class StoryCharacterDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() vietnameseName?: string;
  @IsString() @IsNotEmpty() role: string;
  @IsString() @IsNotEmpty() personality: string;
  @IsString() @IsNotEmpty() speechStyle: string;
  @IsString() @IsNotEmpty() honorific: string;
  @IsString() @IsOptional() note?: string;
}

class StoryGlossaryEntryDto {
  @IsString() @IsNotEmpty() original: string;
  @IsString() @IsNotEmpty() translation: string;
  @IsString() @IsOptional() note?: string;
}

class StoryStyleGuideDto {
  @IsString() @IsNotEmpty() formality: string;
  @IsBoolean() keepHonorifics: boolean;
  @IsBoolean() keepOriginalNames: boolean;
  @IsString() @IsNotEmpty() chapterLabel: string;
  @IsString() @IsOptional() extraNotes?: string;
}

class StoryChapterSummaryDto {
  @IsString() @IsNotEmpty() chapterNumber: string;
  @IsString() @IsNotEmpty() summary: string;
}

export class CreateStoryContextDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() author: string;
  @IsString() @IsNotEmpty() genre: string;
  @IsString() @IsNotEmpty() setting: string;
  @IsString() @IsNotEmpty() targetTone: string;
  @IsString() @IsOptional() sourceLanguage?: string;
  @IsString() @IsOptional() targetLanguage?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryCharacterDto)
  characters: StoryCharacterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryGlossaryEntryDto)
  glossary: StoryGlossaryEntryDto[];

  @ValidateNested()
  @Type(() => StoryStyleGuideDto)
  styleGuide: StoryStyleGuideDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StoryChapterSummaryDto)
  chapterSummaries?: StoryChapterSummaryDto[];
}

export class UpdateStoryContextDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() author?: string;
  @IsString() @IsOptional() genre?: string;
  @IsString() @IsOptional() setting?: string;
  @IsString() @IsOptional() targetTone?: string;
  @IsString() @IsOptional() sourceLanguage?: string;
  @IsString() @IsOptional() targetLanguage?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryCharacterDto)
  characters?: StoryCharacterDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryGlossaryEntryDto)
  glossary?: StoryGlossaryEntryDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => StoryStyleGuideDto)
  styleGuide?: StoryStyleGuideDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryChapterSummaryDto)
  chapterSummaries?: StoryChapterSummaryDto[];
}
