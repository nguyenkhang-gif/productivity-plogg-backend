import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TranslationContextDocument = TranslationContext & Document;

@Schema({ _id: false })
class ProjectInfo {
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) genre: string;
  @Prop({ required: true }) setting: string;
  @Prop({ required: true }) targetTone: string;
  @Prop({ default: 'en' }) sourceLanguage: string;
  @Prop({ default: 'vi' }) targetLanguage: string;
}

@Schema({ _id: false })
class CharacterProfile {
  @Prop({ required: true }) name: string;
  @Prop() vietnameseName: string;
  @Prop({ required: true }) role: string;
  @Prop({ required: true }) personality: string;
  @Prop({ required: true }) speechStyle: string;
  @Prop({ required: true }) honorific: string;
  @Prop() note: string;
}

@Schema({ _id: false })
class GlossaryEntry {
  @Prop({ required: true }) original: string;
  @Prop({ required: true }) translation: string;
  @Prop() note: string;
}

@Schema({ _id: false })
class StyleGuide {
  @Prop({ required: true }) formality: string;
  @Prop({ default: false }) keepHonorifics: boolean;
  @Prop({ default: true }) keepOriginalNames: boolean;
  @Prop({ default: 'Chương' }) chapterLabel: string;
  @Prop() extraNotes: string;
}

@Schema({ _id: false })
class ChapterSummary {
  @Prop({ required: true }) chapterNumber: number;
  @Prop({ required: true }) summary: string;
}

@Schema({ timestamps: true })
export class TranslationContext {
  @Prop({ required: true, index: true }) userId: string;
  @Prop({ type: ProjectInfo, required: true }) projectInfo: ProjectInfo;
  @Prop({ type: [CharacterProfile], default: [] }) characters: CharacterProfile[];
  @Prop({ type: [GlossaryEntry], default: [] }) glossary: GlossaryEntry[];
  @Prop({ type: StyleGuide, required: true }) styleGuide: StyleGuide;
  @Prop({ type: [ChapterSummary], default: [] }) chapterSummaries: ChapterSummary[];
}

export const TranslationContextSchema = SchemaFactory.createForClass(TranslationContext);
