import { addDays, localDateFor } from './focus-date.util';

describe('localDateFor', () => {
  it('returns the UTC date for tzOffset 0', () => {
    expect(localDateFor(new Date('2026-07-05T10:00:00Z'), 0)).toBe(
      '2026-07-05',
    );
  });

  it('rolls to the next day east of UTC (Vietnam, +420)', () => {
    expect(localDateFor(new Date('2026-07-05T17:30:00Z'), 420)).toBe(
      '2026-07-06',
    );
  });

  it('stays on the same day east of UTC before local midnight', () => {
    expect(localDateFor(new Date('2026-07-05T16:59:00Z'), 420)).toBe(
      '2026-07-05',
    );
  });

  it('rolls back a day west of UTC (-300)', () => {
    expect(localDateFor(new Date('2026-07-05T02:00:00Z'), -300)).toBe(
      '2026-07-04',
    );
  });
});

describe('addDays', () => {
  it('adds within a month', () => {
    expect(addDays('2026-07-05', 1)).toBe('2026-07-06');
  });

  it('subtracts across a month boundary', () => {
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
  });

  it('crosses a year boundary', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles leap-year February', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});
