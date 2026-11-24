import { ObjectId } from 'bson';
import { epubMigrator, transformEpub } from './epub.migrator';

describe('transformEpub', () => {
  const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');
  const owner = '64b7f0c2a1b2c3d4e5f60001';

  it('maps a complete document, normalising nested bson values to JSON', () => {
    const createdAt = new Date('2024-01-02T03:04:05.000Z');
    const updatedAt = new Date('2024-02-03T04:05:06.000Z');
    const ref = new ObjectId('64b7f0c2a1b2c3d4e5f60002');
    const when = new Date('2024-01-01T00:00:00.000Z');
    const row = transformEpub({
      _id,
      sampleUrl: 'https://x/a.epub',
      createdUserId: owner,
      properties: { title: 'T', ref, when, list: [1, { a: undefined, b: 2 }] },
      createdAt,
      updatedAt,
      __v: 0,
    });

    expect(row).toEqual({
      id: '64b7f0c2a1b2c3d4e5f60718',
      createdUserId: owner,
      sampleUrl: 'https://x/a.epub',
      properties: {
        title: 'T',
        ref: '64b7f0c2a1b2c3d4e5f60002',
        when: '2024-01-01T00:00:00.000Z',
        list: [1, { b: 2 }],
      },
      createdAt,
      updatedAt,
    });
    expect(row).not.toHaveProperty('__v');
  });

  it('applies defaults for legacy documents', () => {
    const row = transformEpub({ _id, createdUserId: owner })!;
    expect(row.sampleUrl).toBeNull();
    expect(row.properties).toEqual({});
    expect(row.createdAt).toEqual(_id.getTimestamp());
    expect(row.updatedAt).toEqual(row.createdAt);
  });

  it('turns empty sampleUrl into null and non-object properties into {}', () => {
    const row = transformEpub({
      _id,
      createdUserId: owner,
      sampleUrl: '',
      properties: 'oops',
    })!;
    expect(row.sampleUrl).toBeNull();
    expect(row.properties).toEqual({});
  });

  it('strips NUL characters Postgres cannot store', () => {
    const row = transformEpub({
      _id,
      createdUserId: owner,
      sampleUrl: 'a\u0000b',
      properties: { t: 'x\u0000y' },
    })!;
    expect(row.sampleUrl).toBe('ab');
    expect(row.properties).toEqual({ t: 'xy' });
  });

  it.each([
    ['no _id', { createdUserId: owner }],
    ['non-objectid _id', { _id: 'abc', createdUserId: owner }],
    ['missing createdUserId', { _id }],
    ['non-objectid createdUserId', { _id, createdUserId: 'someone' }],
  ])('skips a document with %s', (_label, doc) => {
    expect(transformEpub(doc)).toBeNull();
  });

  it('depends on users and reads the epubs collection', () => {
    expect(epubMigrator).toMatchObject({
      name: 'epubs',
      collection: 'epubs',
      dependsOn: ['users'],
    });
  });
});
