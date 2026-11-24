export interface StoryCharacter {
  name: string;
  vietnameseName?: string;
  role: string;
  personality: string;
  speechStyle: string;
  honorific: string;
  note?: string;
}

export interface StoryGlossaryEntry {
  original: string;
  translation: string;
  note?: string;
}

export interface StoryStyleGuide {
  formality: string;
  keepHonorifics: boolean;
  keepOriginalNames: boolean;
  chapterLabel: string;
  extraNotes?: string;
}

export interface StoryChapterSummary {
  chapterNumber: string;
  summary: string;
}

export class StoryContext {
  id: string;
  userId: string;
  title: string;
  author: string;
  genre: string;
  setting: string;
  targetTone: string;
  sourceLanguage: string;
  targetLanguage: string;
  characters: StoryCharacter[];
  glossary: StoryGlossaryEntry[];
  styleGuide: StoryStyleGuide;
  chapterSummaries: StoryChapterSummary[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<StoryContext>) {
    Object.assign(this, partial);
  }
}
