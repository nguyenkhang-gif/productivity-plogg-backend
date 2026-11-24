import { ObjectId } from 'bson';
import { transformUserProgress } from './user-progress.migrator';

describe('transformUserProgress', () => {
  const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');
  const userId = '64b7f0c2a1b2c3d4e5f60001';

  it('maps a complete document', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-07-05T03:04:05.000Z');
    expect(
      transformUserProgress({
        _id,
        userId,
        totalXp: 1200,
        totalFocusMin: 1200,
        drinkId: 'latte',
        tzOffset: 420,
        todayCount: 2,
        todayFocusMin: 50,
        lastActiveLocalDate: '2026-07-05',
        currentStreak: 4,
        longestStreak: 9,
        createdAt,
        updatedAt,
        __v: 3,
      }),
    ).toEqual({
      id: '64b7f0c2a1b2c3d4e5f60718',
      userId,
      totalXp: 1200,
      totalFocusMin: 1200,
      drinkId: 'latte',
      tzOffset: 420,
      todayCount: 2,
      todayFocusMin: 50,
      lastActiveLocalDate: '2026-07-05',
      currentStreak: 4,
      longestStreak: 9,
      createdAt,
      updatedAt,
    });
  });

  it('defaults counters to 0 and optional fields to null for legacy documents', () => {
    const row = transformUserProgress({ _id, userId })!;
    expect(row).toMatchObject({
      totalXp: 0,
      totalFocusMin: 0,
      drinkId: null,
      tzOffset: 0,
      todayCount: 0,
      todayFocusMin: 0,
      lastActiveLocalDate: null,
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(row.createdAt).toEqual(_id.getTimestamp());
    expect(row.updatedAt).toEqual(row.createdAt);
  });

  it('keeps negative tzOffset and drops malformed lastActiveLocalDate/empty drinkId', () => {
    const row = transformUserProgress({
      _id,
      userId,
      tzOffset: -300,
      lastActiveLocalDate: 'yesterday',
      drinkId: '',
    })!;
    expect(row).toMatchObject({
      tzOffset: -300,
      lastActiveLocalDate: null,
      drinkId: null,
    });
  });

  it.each([
    ['no _id', { userId }],
    ['no userId', { _id }],
    ['legacy non-ObjectId userId', { _id, userId: 'abc' }],
  ])('skips a document with %s', (_label, doc) => {
    expect(transformUserProgress(doc)).toBeNull();
  });
});
