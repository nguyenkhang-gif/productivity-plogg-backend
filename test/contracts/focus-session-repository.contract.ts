import { newObjectId } from 'src/shared/database/object-id';
import { FocusSession } from 'src/modules/productivity/focus/domain/focus-session.entity';
import {
  DuplicateSessionError,
  type FocusSessionRepository,
} from 'src/modules/productivity/focus/domain/focus-session.repository.interface';

export interface RollupRow {
  /** date / weekStart / month depending on the table. */
  key: string;
  sessionsCount: number;
  totalFocusMin: number;
  totalXp: number;
}

export interface FocusSessionRepositoryHarness {
  repo: FocusSessionRepository;
  /** Creates (and tracks for cleanup) a user the sessions can belong to. */
  newUser(): Promise<string>;
  /** Reads the materialised rollup rows of one user, sorted by key. */
  readRollups(
    kind: 'daily' | 'weekly' | 'monthly',
    userId: string,
  ): Promise<RollupRow[]>;
  /** Removes every user (and cascaded data) created through newUser(). */
  cleanup(): Promise<void>;
}

/** Behaviour every FocusSessionRepository implementation must satisfy. */
export function describeFocusSessionRepositoryContract(
  name: string,
  factory: () => Promise<FocusSessionRepositoryHarness>,
): void {
  describe(`FocusSessionRepository contract: ${name}`, () => {
    let h: FocusSessionRepositoryHarness;
    let repo: FocusSessionRepository;
    /** Random far-future year so rollups never touch other runs' data. */
    let year: string;

    const session = (
      userId: string,
      localDate: string,
      durationMin: number,
      clientSessionId = `cs-${newObjectId()}`,
    ) =>
      new FocusSession({
        userId,
        clientSessionId,
        completedAt: new Date(`${localDate}T10:00:00Z`),
        localDate,
        durationMin,
        xpEarned: durationMin,
      });

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });

    beforeEach(() => {
      year = String(4000 + Math.floor(Math.random() * 5000));
    });

    afterAll(async () => {
      await h.cleanup();
    });

    describe('insertRaw', () => {
      it('persists a session and returns it with a 24-hex id', async () => {
        const userId = await h.newUser();
        const saved = await repo.insertRaw(
          session(userId, `${year}-03-01`, 25),
        );
        expect(saved.id).toMatch(/^[0-9a-f]{24}$/);
        expect(saved.userId).toBe(userId);
        expect(saved.durationMin).toBe(25);
      });

      it('throws DuplicateSessionError for a repeated clientSessionId of the same user', async () => {
        const userId = await h.newUser();
        await repo.insertRaw(session(userId, `${year}-03-01`, 25, 'same-id-1'));
        await expect(
          repo.insertRaw(session(userId, `${year}-03-02`, 10, 'same-id-1')),
        ).rejects.toBeInstanceOf(DuplicateSessionError);
      });

      it('allows the same clientSessionId for different users', async () => {
        const a = await h.newUser();
        const b = await h.newUser();
        await repo.insertRaw(session(a, `${year}-03-01`, 25, 'shared-id-1'));
        await expect(
          repo.insertRaw(session(b, `${year}-03-01`, 25, 'shared-id-1')),
        ).resolves.toMatchObject({ userId: b });
      });
    });

    describe('aggregateDailyFromRaw', () => {
      it('groups by localDate, sorts ascending and includes both bounds', async () => {
        const userId = await h.newUser();
        await repo.insertRaw(session(userId, `${year}-03-02`, 30));
        await repo.insertRaw(session(userId, `${year}-03-02`, 15));
        await repo.insertRaw(session(userId, `${year}-03-01`, 25));
        await repo.insertRaw(session(userId, `${year}-03-31`, 5));
        await repo.insertRaw(session(userId, `${year}-04-01`, 99));
        await repo.insertRaw(session(userId, `${year}-02-28`, 99));

        const rows = await repo.aggregateDailyFromRaw(
          userId,
          `${year}-03-01`,
          `${year}-03-31`,
        );

        expect(rows.map((r) => r.periodKey)).toEqual([
          `${year}-03-01`,
          `${year}-03-02`,
          `${year}-03-31`,
        ]);
        expect(rows[1]).toMatchObject({
          userId,
          sessionsCount: 2,
          totalFocusMin: 45,
          totalXp: 45,
        });
      });

      it('only counts the requested user and returns [] when empty', async () => {
        const a = await h.newUser();
        const b = await h.newUser();
        await repo.insertRaw(session(a, `${year}-03-01`, 25));
        const rows = await repo.aggregateDailyFromRaw(
          b,
          `${year}-03-01`,
          `${year}-03-31`,
        );
        expect(rows).toEqual([]);
      });
    });

    describe('rollups', () => {
      it('rollupDaily writes one row per user and date, only for the requested dates', async () => {
        const a = await h.newUser();
        const b = await h.newUser();
        await repo.insertRaw(session(a, `${year}-05-01`, 20));
        await repo.insertRaw(session(a, `${year}-05-01`, 10));
        await repo.insertRaw(session(b, `${year}-05-01`, 7));
        await repo.insertRaw(session(a, `${year}-05-02`, 50));

        await repo.rollupDaily([`${year}-05-01`]);

        expect(await h.readRollups('daily', a)).toEqual([
          {
            key: `${year}-05-01`,
            sessionsCount: 2,
            totalFocusMin: 30,
            totalXp: 30,
          },
        ]);
        expect(await h.readRollups('daily', b)).toHaveLength(1);
      });

      it('rollupDaily replaces (not adds to) existing rows, so re-runs are idempotent', async () => {
        const userId = await h.newUser();
        await repo.insertRaw(session(userId, `${year}-05-01`, 20));
        await repo.rollupDaily([`${year}-05-01`]);
        await repo.rollupDaily([`${year}-05-01`]);
        expect((await h.readRollups('daily', userId))[0]).toMatchObject({
          sessionsCount: 1,
          totalFocusMin: 20,
        });

        await repo.insertRaw(session(userId, `${year}-05-01`, 5));
        await repo.rollupDaily([`${year}-05-01`]);
        expect((await h.readRollups('daily', userId))[0]).toMatchObject({
          sessionsCount: 2,
          totalFocusMin: 25,
        });
      });

      it('rollupDaily with no dates is a no-op', async () => {
        await expect(repo.rollupDaily([])).resolves.toBeUndefined();
      });

      it('rollupWeekly sums daily rows within [weekStart, weekEnd] inclusive', async () => {
        const userId = await h.newUser();
        // Mon 05-04 .. Sun 05-10 of the (fictional) year; 05-03 and 05-11 are outside
        for (const [day, min] of [
          ['03', 100],
          ['04', 10],
          ['07', 20],
          ['10', 30],
          ['11', 100],
        ] as const) {
          await repo.insertRaw(session(userId, `${year}-05-${day}`, min));
        }
        await repo.rollupDaily(
          ['03', '04', '07', '10', '11'].map((d) => `${year}-05-${d}`),
        );

        await repo.rollupWeekly(`${year}-05-04`, `${year}-05-10`);

        expect(await h.readRollups('weekly', userId)).toEqual([
          {
            key: `${year}-05-04`,
            sessionsCount: 3,
            totalFocusMin: 60,
            totalXp: 60,
          },
        ]);

        // idempotent / replace
        await repo.rollupWeekly(`${year}-05-04`, `${year}-05-10`);
        expect((await h.readRollups('weekly', userId))[0].totalFocusMin).toBe(
          60,
        );
      });

      it('rollupMonthly sums every daily row of the month', async () => {
        const userId = await h.newUser();
        for (const [date, min] of [
          [`${year}-06-01`, 10],
          [`${year}-06-30`, 20],
          [`${year}-07-01`, 100],
          [`${year}-05-31`, 100],
        ] as const) {
          await repo.insertRaw(session(userId, date, min));
        }
        await repo.rollupDaily([
          `${year}-06-01`,
          `${year}-06-30`,
          `${year}-07-01`,
          `${year}-05-31`,
        ]);

        await repo.rollupMonthly(`${year}-06`);
        await repo.rollupMonthly(`${year}-06`);

        expect(await h.readRollups('monthly', userId)).toEqual([
          {
            key: `${year}-06`,
            sessionsCount: 2,
            totalFocusMin: 30,
            totalXp: 30,
          },
        ]);
      });
    });

    describe('concurrency', () => {
      it('N parallel recordings are all stored and sum correctly', async () => {
        const userId = await h.newUser();
        const date = `${year}-08-15`;
        const n = 25;
        await Promise.all(
          Array.from({ length: n }, (_, i) =>
            repo.insertRaw(session(userId, date, i + 1)),
          ),
        );

        const [row] = await repo.aggregateDailyFromRaw(userId, date, date);
        expect(row.sessionsCount).toBe(n);
        expect(row.totalFocusMin).toBe((n * (n + 1)) / 2);
      });

      it('the same clientSessionId recorded in parallel succeeds exactly once', async () => {
        const userId = await h.newUser();
        const results = await Promise.allSettled(
          Array.from({ length: 8 }, () =>
            repo.insertRaw(session(userId, `${year}-08-16`, 10, 'racing-id-1')),
          ),
        );
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        for (const r of results.filter((r) => r.status === 'rejected')) {
          expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
            DuplicateSessionError,
          );
        }
      });

      it('parallel rollups of the same date converge on the exact totals', async () => {
        const userId = await h.newUser();
        const date = `${year}-08-17`;
        await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            repo.insertRaw(session(userId, date, i + 1)),
          ),
        );

        await Promise.all(
          Array.from({ length: 6 }, () => repo.rollupDaily([date])),
        );

        expect(await h.readRollups('daily', userId)).toEqual([
          { key: date, sessionsCount: 10, totalFocusMin: 55, totalXp: 55 },
        ]);
      });
    });
  });
}
