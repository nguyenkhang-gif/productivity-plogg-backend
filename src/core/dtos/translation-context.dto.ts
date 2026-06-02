import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ProjectInfoDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() genre: string;
  @IsString() @IsNotEmpty() setting: string;
  @IsString() @IsNotEmpty() targetTone: string;
  @IsString() @IsOptional() sourceLanguage?: string;
  @IsString() @IsOptional() targetLanguage?: string;
}

class CharacterProfileDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() vietnameseName?: string;
  @IsString() @IsNotEmpty() role: string;
  @IsString() @IsNotEmpty() personality: string;
  @IsString() @IsNotEmpty() speechStyle: string;
  @IsString() @IsNotEmpty() honorific: string;
  @IsString() @IsOptional() note?: string;
}

class GlossaryEntryDto {
  @IsString() @IsNotEmpty() original: string;
  @IsString() @IsNotEmpty() translation: string;
  @IsString() @IsOptional() note?: string;
}

class StyleGuideDto {
  @IsString() @IsNotEmpty() formality: string;
  @IsBoolean() keepHonorifics: boolean;
  @IsBoolean() keepOriginalNames: boolean;
  @IsString() @IsNotEmpty() chapterLabel: string;
  @IsString() @IsOptional() extraNotes?: string;
}

class ChapterSummaryDto {
  @IsNumber() chapterNumber: number;
  @IsString() @IsNotEmpty() summary: string;
}

export class CreateTranslationContextDto {
  @ValidateNested()
  @Type(() => ProjectInfoDto)
  projectInfo: ProjectInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterProfileDto)
  characters: CharacterProfileDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlossaryEntryDto)
  glossary: GlossaryEntryDto[];

  @ValidateNested()
  @Type(() => StyleGuideDto)
  styleGuide: StyleGuideDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChapterSummaryDto)
  chapterSummaries?: ChapterSummaryDto[];
}

export class UpdateTranslationContextDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectInfoDto)
  projectInfo?: ProjectInfoDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterProfileDto)
  characters?: CharacterProfileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlossaryEntryDto)
  glossary?: GlossaryEntryDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => StyleGuideDto)
  styleGuide?: StyleGuideDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterSummaryDto)
  chapterSummaries?: ChapterSummaryDto[];
}
