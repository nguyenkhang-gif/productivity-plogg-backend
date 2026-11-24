export interface CharacterProfile {
  name: string;
  vietnameseName?: string;
  role: string;
  personality: string;
  speechStyle: string;
  honorific: string;
  note?: string;
}

export interface GlossaryEntry {
  original: string;
  translation: string;
  note?: string;
}

export interface StyleGuide {
  formality: string;
  keepHonorifics: boolean;
  keepOriginalNames: boolean;
  chapterLabel: string;
  extraNotes?: string;
}

export interface ChapterSummary {
  chapterNumber: string;
  summary: string;
}

export class TranslationContext {
  id: string;
  userId: string;
  title: string;
  genre: string;
  setting: string;
  targetTone: string;
  sourceLanguage: string;
  targetLanguage: string;
  characters: CharacterProfile[];
  glossary: GlossaryEntry[];
  styleGuide: StyleGuide;
  chapterSummaries: ChapterSummary[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<TranslationContext>) {
    Object.assign(this, partial);
  }
}
