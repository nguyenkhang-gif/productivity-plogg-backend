import { ObjectId } from 'bson';
import { transformVault } from './vault.migrator';

describe('transformVault', () => {
  const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');
  const doc = {
    _id,
    userId: '64b7f0c2a1b2c3d4e5f60001',
    scope: 'tasks',
    ciphertext: 'c2VjcmV0LWJsb2I=',
    iv: 'AAAAAAAAAAAAAAAA',
    wrappedKey: 'd3JhcHBlZA==',
    kdf: { algo: 'PBKDF2-SHA256', salt: 'c2FsdA==', iterations: 600000 },
    version: 7,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    __v: 0,
  };

  it('copies the opaque payload byte-for-byte and keeps version and timestamps', () => {
    expect(transformVault(doc)).toEqual({
      id: '64b7f0c2a1b2c3d4e5f60718',
      userId: '64b7f0c2a1b2c3d4e5f60001',
      scope: 'tasks',
      ciphertext: 'c2VjcmV0LWJsb2I=',
      iv: 'AAAAAAAAAAAAAAAA',
      wrappedKey: 'd3JhcHBlZA==',
      kdf: { algo: 'PBKDF2-SHA256', salt: 'c2FsdA==', iterations: 600000 },
      version: 7,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
  });

  it('drops unknown fields inside kdf and defaults a missing/invalid version to 1', () => {
    const row = transformVault({
      ...doc,
      version: undefined,
      kdf: { ...doc.kdf, memory: 64, extra: 'x' },
    })!;
    expect(row.kdf).toEqual(doc.kdf);
    expect(row.version).toBe(1);
    expect(transformVault({ ...doc, version: 0 })!.version).toBe(1);
  });

  it('falls back to the _id timestamp when timestamps are missing', () => {
    const row = transformVault({
      ...doc,
      createdAt: undefined,
      updatedAt: undefined,
    })!;
    expect(row.createdAt).toEqual(_id.getTimestamp());
    expect(row.updatedAt).toEqual(row.createdAt);
  });

  it.each([
    ['no ciphertext', { ciphertext: undefined }],
    ['empty iv', { iv: '' }],
    ['no wrappedKey', { wrappedKey: undefined }],
    ['no scope', { scope: undefined }],
    ['legacy non-ObjectId userId', { userId: 'legacy-user' }],
    ['kdf missing', { kdf: undefined }],
    ['kdf as string', { kdf: 'argon2id' }],
    ['kdf without iterations', { kdf: { algo: 'a', salt: 's' } }],
  ])('skips a document with %s', (_label, patch) => {
    expect(transformVault({ ...doc, ...patch })).toBeNull();
  });
});
