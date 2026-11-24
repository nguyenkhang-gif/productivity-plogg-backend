import { ObjectId } from 'bson';
import {
  transformTranslationContext,
  translationContextMigrator,
} from './translation-context.migrator';

describe('transformTranslationContext', () => {
  const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');
  const userId = '64b7f0c2a1b2c3d4e5f60001';
  const styleGuide = {
    formality: 'low',
    keepHonorifics: false,
    keepOriginalNames: true,
    chapterLabel: 'Chương',
    extraNotes: 'n',
  };
  const base = {
    _id,
    userId,
    title: 'T',
    genre: 'g',
    setting: 's',
    targetTone: 'tone',
    styleGuide,
  };

  it('maps a complete document', () => {
    const createdAt = new Date('2024-01-02T03:04:05.000Z');
    const updatedAt = new Date('2024-02-03T04:05:06.000Z');
    const row = transformTranslationContext({
      ...base,
      sourceLanguage: 'ko',
      targetLanguage: 'vi',
      characters: [{ name: 'N', role: 'r', _id: new ObjectId() }],
      glossary: [{ original: 'a', translation: 'b', note: 'c' }],
      chapterSummaries: [{ chapterNumber: '2', summary: 'S' }],
      createdAt,
      updatedAt,
      __v: 1,
    })!;

    expect(row).toMatchObject({
      id: '64b7f0c2a1b2c3d4e5f60718',
      userId,
      title: 'T',
      genre: 'g',
      setting: 's',
      targetTone: 'tone',
      sourceLanguage: 'ko',
      targetLanguage: 'vi',
      glossary: [{ original: 'a', translation: 'b', note: 'c' }],
      styleGuide,
      chapterSummaries: [{ chapterNumber: '2', summary: 'S' }],
      createdAt,
      updatedAt,
    });
    expect((row.characters as any[])[0]).toMatchObject({
      name: 'N',
      role: 'r',
    });
    expect(row).not.toHaveProperty('__v');
    expect(row).not.toHaveProperty('author');
  });

  it('defaults languages, lists and timestamps for legacy documents', () => {
    const row = transformTranslationContext(base)!;
    expect(row).toMatchObject({
      sourceLanguage: 'en',
      targetLanguage: 'vi',
      characters: [],
      glossary: [],
      chapterSummaries: [],
    });
    expect(row.createdAt).toEqual(_id.getTimestamp());
  });

  it('strips NUL characters from json and text', () => {
    const row = transformTranslationContext({
      ...base,
      title: 'a\u0000b',
      glossary: [{ original: 'x\u0000', translation: 'y' }],
    })!;
    expect(row.title).toBe('ab');
    expect(row.glossary).toEqual([{ original: 'x', translation: 'y' }]);
  });

  it.each([
    ['no _id', { ...base, _id: undefined }],
    ['non-objectid userId', { ...base, userId: 'someone' }],
    ['missing userId', { ...base, userId: undefined }],
    ['missing styleGuide', { ...base, styleGuide: undefined }],
  ])('skips a document with %s', (_label, doc) => {
    expect(transformTranslationContext(doc)).toBeNull();
  });

  it('depends on users and reads the translationcontexts collection', () => {
    expect(translationContextMigrator).toMatchObject({
      name: 'translation-contexts',
      collection: 'translationcontexts',
      dependsOn: ['users'],
    });
  });
});
