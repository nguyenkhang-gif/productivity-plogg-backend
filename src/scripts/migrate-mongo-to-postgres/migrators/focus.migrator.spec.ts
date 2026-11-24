import { ObjectId } from 'bson';
import {
  transformFocusDaily,
  transformFocusMonthly,
  transformFocusRaw,
  transformFocusWeekly,
} from './focus.migrator';

const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');
const userId = new ObjectId('64b7f0c2a1b2c3d4e5f60001');

describe('transformFocusRaw', () => {
  const doc = {
    _id,
    userId: userId.toHexString(),
    clientSessionId: 'c7a1-session-0001',
    completedAt: new Date('2026-07-05T17:30:00.000Z'),
    localDate: '2026-07-06',
    durationMin: 25,
    xpEarned: 25,
    __v: 0,
  };

  it('maps a document keeping _id as hex and localDate verbatim', () => {
    expect(transformFocusRaw(doc)).toEqual({
      id: '64b7f0c2a1b2c3d4e5f60718',
      userId: '64b7f0c2a1b2c3d4e5f60001',
      clientSessionId: 'c7a1-session-0001',
      completedAt: new Date('2026-07-05T17:30:00.000Z'),
      // user's local date (tz +420) differs from the UTC date: never recomputed
      localDate: '2026-07-06',
      durationMin: 25,
      xpEarned: 25,
    });
  });

  it('accepts ISO string dates and rounds double-typed counters', () => {
    const row = transformFocusRaw({
      ...doc,
      completedAt: '2026-07-05T17:30:00Z',
      durationMin: 24.9999999,
      xpEarned: 25.0000001,
    })!;
    expect(row.completedAt).toEqual(new Date('2026-07-05T17:30:00.000Z'));
    expect(row.durationMin).toBe(25);
    expect(row.xpEarned).toBe(25);
  });

  it.each([
    ['no _id', { _id: undefined }],
    ['non-ObjectId userId (legacy)', { userId: 'user-42' }],
    ['empty clientSessionId', { clientSessionId: '' }],
    ['invalid completedAt', { completedAt: 'garbage' }],
    ['missing completedAt', { completedAt: undefined }],
    ['malformed localDate', { localDate: '2026-7-6' }],
    ['non-numeric durationMin', { durationMin: '25' }],
    ['NaN xpEarned', { xpEarned: NaN }],
  ])('skips a document with %s', (_label, patch) => {
    expect(transformFocusRaw({ ...doc, ...patch })).toBeNull();
  });
});

describe('transformFocusDaily', () => {
  const doc = {
    _id,
    userId: userId.toHexString(),
    date: '2026-07-06',
    sessionsCount: 3,
    totalFocusMin: 75,
    totalXp: 75,
    createdAt: new Date('2026-07-07T00:05:00.000Z'),
  };

  it('maps the $merge-written shape (date key, createdAt kept)', () => {
    expect(transformFocusDaily(doc)).toEqual({
      userId: '64b7f0c2a1b2c3d4e5f60001',
      date: '2026-07-06',
      sessionsCount: 3,
      totalFocusMin: 75,
      totalXp: 75,
      createdAt: new Date('2026-07-07T00:05:00.000Z'),
    });
  });

  it('falls back to the _id timestamp when createdAt is missing', () => {
    const row = transformFocusDaily({ ...doc, createdAt: undefined })!;
    expect(row.createdAt).toEqual(_id.getTimestamp());
  });

  it.each([
    ['bad date', { date: '2026-07' }],
    ['missing counters', { totalXp: undefined }],
    ['bad userId', { userId: 'x' }],
  ])('skips a document with %s', (_label, patch) => {
    expect(transformFocusDaily({ ...doc, ...patch })).toBeNull();
  });
});

describe('transformFocusWeekly / Monthly', () => {
  const base = {
    _id,
    userId: userId.toHexString(),
    sessionsCount: 10,
    totalFocusMin: 250,
    totalXp: 250,
  };

  it('maps weekStart (Monday) and month keys; ignores _id', () => {
    expect(transformFocusWeekly({ ...base, weekStart: '2026-06-29' })).toEqual({
      userId: '64b7f0c2a1b2c3d4e5f60001',
      weekStart: '2026-06-29',
      sessionsCount: 10,
      totalFocusMin: 250,
      totalXp: 250,
    });
    expect(transformFocusMonthly({ ...base, month: '2026-06' })).toEqual({
      userId: '64b7f0c2a1b2c3d4e5f60001',
      month: '2026-06',
      sessionsCount: 10,
      totalFocusMin: 250,
      totalXp: 250,
    });
  });

  it('skips malformed period keys', () => {
    expect(transformFocusWeekly({ ...base, weekStart: '2026-06' })).toBeNull();
    expect(transformFocusWeekly({ ...base })).toBeNull();
    expect(transformFocusMonthly({ ...base, month: '2026-06-01' })).toBeNull();
    expect(transformFocusMonthly({ ...base, month: undefined })).toBeNull();
  });
});
