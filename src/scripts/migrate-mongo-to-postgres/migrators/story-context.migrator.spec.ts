import { ObjectId } from 'bson';
import {
  storyContextMigrator,
  transformStoryContext,
} from './story-context.migrator';

describe('transformStoryContext', () => {
  const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');
  const userId = '64b7f0c2a1b2c3d4e5f60001';
  const styleGuide = {
    formality: 'high',
    keepHonorifics: true,
    keepOriginalNames: false,
    chapterLabel: 'Chương',
  };
  const base = {
    _id,
    userId,
    title: 'T',
    author: 'A',
    genre: 'g',
    setting: 's',
    targetTone: 'tone',
    styleGuide,
  };

  it('maps a complete document and keeps nested lists as JSON', () => {
    const createdAt = new Date('2024-01-02T03:04:05.000Z');
    const updatedAt = new Date('2024-02-03T04:05:06.000Z');
    const characters = [
      {
        name: 'Aya',
        role: 'hero',
        personality: 'p',
        speechStyle: 's',
        honorific: 'h',
      },
    ];
    const row = transformStoryContext({
      ...base,
      sourceLanguage: 'ja',
      targetLanguage: 'vi',
      characters: characters.map((c) => ({ ...c, _id: new ObjectId() })),
      glossary: [{ original: 'ki', translation: 'khí' }],
      chapterSummaries: [{ chapterNumber: '1', summary: 'S' }],
      createdAt,
      updatedAt,
      __v: 3,
    })!;

    expect(row).toMatchObject({
      id: '64b7f0c2a1b2c3d4e5f60718',
      userId,
      title: 'T',
      author: 'A',
      genre: 'g',
      setting: 's',
      targetTone: 'tone',
      sourceLanguage: 'ja',
      targetLanguage: 'vi',
      glossary: [{ original: 'ki', translation: 'khí' }],
      styleGuide,
      chapterSummaries: [{ chapterNumber: '1', summary: 'S' }],
      createdAt,
      updatedAt,
    });
    expect((row.characters as any[])[0]).toMatchObject(characters[0]);
    expect(row).not.toHaveProperty('__v');
  });

  it('defaults languages, lists and timestamps for legacy documents', () => {
    const row = transformStoryContext(base)!;
    expect(row).toMatchObject({
      sourceLanguage: 'en',
      targetLanguage: 'vi',
      characters: [],
      glossary: [],
      chapterSummaries: [],
    });
    expect(row.createdAt).toEqual(_id.getTimestamp());
    expect(row.updatedAt).toEqual(row.createdAt);
  });

  it('coerces non-array lists to [] and missing strings to ""', () => {
    const row = transformStoryContext({
      _id,
      userId,
      styleGuide,
      characters: 'nope',
      glossary: { a: 1 },
    })!;
    expect(row.characters).toEqual([]);
    expect(row.glossary).toEqual([]);
    expect(row.title).toBe('');
  });

  it.each([
    ['no _id', { ...base, _id: undefined }],
    ['non-objectid userId', { ...base, userId: 'someone' }],
    ['missing userId', { ...base, userId: undefined }],
    ['missing styleGuide', { ...base, styleGuide: undefined }],
    ['array styleGuide', { ...base, styleGuide: [] }],
  ])('skips a document with %s', (_label, doc) => {
    expect(transformStoryContext(doc)).toBeNull();
  });

  it('depends on users and reads the storycontexts collection', () => {
    expect(storyContextMigrator).toMatchObject({
      name: 'story-contexts',
      collection: 'storycontexts',
      dependsOn: ['users'],
    });
  });
});
