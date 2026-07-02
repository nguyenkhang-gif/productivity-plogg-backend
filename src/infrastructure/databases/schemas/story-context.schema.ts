import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StoryContextDocument = StoryContext & Document;

@Schema({ _id: false })
class StoryCharacter {
  @Prop({ required: true }) name: string;
  @Prop() vietnameseName: string;
  @Prop({ required: true }) role: string;
  @Prop({ required: true }) personality: string;
  @Prop({ required: true }) speechStyle: string;
  @Prop({ required: true }) honorific: string;
  @Prop() note: string;
}

@Schema({ _id: false })
class StoryGlossaryEntry {
  @Prop({ required: true }) original: string;
  @Prop({ required: true }) translation: string;
  @Prop() note: string;
}

@Schema({ _id: false })
class StoryStyleGuide {
  @Prop({ required: true }) formality: string;
  @Prop({ default: false }) keepHonorifics: boolean;
  @Prop({ default: true }) keepOriginalNames: boolean;
  @Prop({ default: 'Chương' }) chapterLabel: string;
  @Prop() extraNotes: string;
}

@Schema({ _id: false })
class StoryChapterSummary {
  @Prop({ required: true }) chapterNumber: string;
  @Prop({ required: true }) summary: string;
}

@Schema({ timestamps: true })
export class StoryContext {
  @Prop({ required: true, index: true }) userId: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) author: string;
  @Prop({ required: true }) genre: string;
  @Prop({ required: true }) setting: string;
  @Prop({ required: true }) targetTone: string;
  @Prop({ default: 'en' }) sourceLanguage: string;
  @Prop({ default: 'vi' }) targetLanguage: string;
  @Prop({ type: [StoryCharacter], default: [] }) characters: StoryCharacter[];
  @Prop({ type: [StoryGlossaryEntry], default: [] })
  glossary: StoryGlossaryEntry[];
  @Prop({ type: StoryStyleGuide, required: true }) styleGuide: StoryStyleGuide;
  @Prop({ type: [StoryChapterSummary], default: [] })
  chapterSummaries: StoryChapterSummary[];
}

export const StoryContextSchema = SchemaFactory.createForClass(StoryContext);
