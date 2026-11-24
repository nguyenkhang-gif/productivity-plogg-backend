import { ObjectId } from 'bson';
import { transformUser } from './users.migrator';

describe('transformUser', () => {
  const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');

  it('maps a complete document and keeps _id as hex and timestamps as-is', () => {
    const createdAt = new Date('2024-01-02T03:04:05.000Z');
    const updatedAt = new Date('2024-02-03T04:05:06.000Z');
    const lastSeen = new Date('2024-03-04T05:06:07.000Z');
    const row = transformUser({
      _id,
      fullName: 'Ada Lovelace',
      username: 'ada',
      email: 'Ada@Example.com',
      passwordHash: '$2b$12$abc',
      gender: 'female',
      profilePic: 'https://img/ada.png',
      membership: 'premium',
      role: 'admin',
      isPrivate: true,
      resetPasswordToken: 'tok',
      googleId: 'g1',
      facebookId: 'f1',
      lastSeen,
      createdAt,
      updatedAt,
      __v: 0,
    });

    expect(row).toEqual({
      id: '64b7f0c2a1b2c3d4e5f60718',
      fullName: 'Ada Lovelace',
      username: 'ada',
      email: 'Ada@Example.com',
      passwordHash: '$2b$12$abc',
      gender: 'female',
      profilePic: 'https://img/ada.png',
      membership: 'premium',
      role: 'admin',
      isPrivate: true,
      resetPasswordToken: 'tok',
      googleId: 'g1',
      facebookId: 'f1',
      lastSeen,
      createdAt,
      updatedAt,
    });
    expect(row).not.toHaveProperty('__v');
  });

  it('applies defaults for legacy documents missing optional fields', () => {
    const row = transformUser({ _id, username: 'old', email: 'old@x.io' })!;
    expect(row).toMatchObject({
      fullName: 'old',
      passwordHash: '',
      gender: 'other',
      profilePic: null,
      membership: 'basic',
      role: 'user',
      isPrivate: false,
      resetPasswordToken: null,
      googleId: null,
      facebookId: null,
      lastSeen: null,
    });
  });

  it('falls back to the ObjectId timestamp when createdAt is missing', () => {
    const row = transformUser({ _id, username: 'old', email: 'old@x.io' })!;
    expect(row.createdAt).toEqual(_id.getTimestamp());
    expect(row.updatedAt).toEqual(row.createdAt);
  });

  it('coerces unknown enum values and empty strings to safe values', () => {
    const row = transformUser({
      _id,
      username: 'u',
      email: 'u@x.io',
      gender: 'robot',
      membership: 'gold',
      role: 'superuser',
      googleId: '',
      profilePic: '',
      isPrivate: 'yes',
      lastSeen: 'not-a-date',
    })!;
    expect(row).toMatchObject({
      gender: 'other',
      membership: 'basic',
      role: 'user',
      googleId: null,
      profilePic: null,
      isPrivate: false,
      lastSeen: null,
    });
  });

  it('accepts a string hex _id and lowercases it', () => {
    const row = transformUser({
      _id: '64B7F0C2A1B2C3D4E5F60718',
      username: 'u',
      email: 'u@x.io',
    })!;
    expect(row.id).toBe('64b7f0c2a1b2c3d4e5f60718');
  });

  it.each([
    ['missing username', { _id, email: 'a@b.c' }],
    ['missing email', { _id, username: 'a' }],
    ['non-objectid _id', { _id: 'abc', username: 'a', email: 'a@b.c' }],
    ['no _id', { username: 'a', email: 'a@b.c' }],
  ])('skips a document with %s', (_label, doc) => {
    expect(transformUser(doc)).toBeNull();
  });
});
