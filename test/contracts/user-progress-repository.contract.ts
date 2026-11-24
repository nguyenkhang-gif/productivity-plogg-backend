import type {
  SessionDelta,
  UserProgressRepository,
} from 'src/modules/productivity/focus/domain/user-progress.repository.interface';

export interface UserProgressRepositoryHarness {
  repo: UserProgressRepository;
  newUser(): Promise<string>;
  cleanup(): Promise<void>;
}

const delta = (overrides: Partial<SessionDelta> = {}): SessionDelta => ({
  xp: 25,
  focusMin: 25,
  localDate: '2026-07-05',
  tzOffset: 420,
  todayCount: 1,
  todayFocusMin: 25,
  currentStreak: 1,
  longestStreak: 1,
  ...overrides,
});

/** Behaviour every UserProgressRepository implementation must satisfy. */
export function describeUserProgressRepositoryContract(
  name: string,
  factory: () => Promise<UserProgressRepositoryHarness>,
): void {
  describe(`UserProgressRepository contract: ${name}`, () => {
    let h: UserProgressRepositoryHarness;
    let repo: UserProgressRepository;

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });

    afterAll(async () => {
      await h.cleanup();
    });

    it('findByUserId returns null for a user without progress', async () => {
      expect(await repo.findByUserId(await h.newUser())).toBeNull();
    });

    describe('applySession', () => {
      it('creates the progress document on first session', async () => {
        const userId = await h.newUser();
        const p = await repo.applySession(userId, delta());
        expect(p.id).toMatch(/^[0-9a-f]{24}$/);
        expect(p).toMatchObject({
          userId,
          totalXp: 25,
          totalFocusMin: 25,
          tzOffset: 420,
          todayCount: 1,
          todayFocusMin: 25,
          lastActiveLocalDate: '2026-07-05',
          currentStreak: 1,
          longestStreak: 1,
        });
        expect(p.drinkId).toBeUndefined();
        expect(p.updatedAt).toBeInstanceOf(Date);
        expect(await repo.findByUserId(userId)).toMatchObject({
          totalXp: 25,
          lastActiveLocalDate: '2026-07-05',
        });
      });

      it('increments totals but overwrites the other fields', async () => {
        const userId = await h.newUser();
        await repo.applySession(userId, delta());
        const p = await repo.applySession(
          userId,
          delta({
            xp: 10,
            focusMin: 10,
            localDate: '2026-07-06',
            tzOffset: -300,
            todayCount: 1,
            todayFocusMin: 10,
            currentStreak: 2,
            longestStreak: 2,
          }),
        );
        expect(p).toMatchObject({
          totalXp: 35,
          totalFocusMin: 35,
          tzOffset: -300,
          todayCount: 1,
          todayFocusMin: 10,
          lastActiveLocalDate: '2026-07-06',
          currentStreak: 2,
          longestStreak: 2,
        });
      });

      it('keeps a previously configured drinkId', async () => {
        const userId = await h.newUser();
        await repo.updateConfig(userId, { drinkId: 'latte' });
        const p = await repo.applySession(userId, delta());
        expect(p.drinkId).toBe('latte');
        expect(p.totalXp).toBe(25);
      });

      it('N parallel sessions never lose an increment', async () => {
        const userId = await h.newUser();
        const n = 30;
        await Promise.all(
          Array.from({ length: n }, () =>
            repo.applySession(userId, delta({ xp: 3, focusMin: 2 })),
          ),
        );
        const p = await repo.findByUserId(userId);
        expect(p!.totalXp).toBe(3 * n);
        expect(p!.totalFocusMin).toBe(2 * n);
      });
    });

    describe('updateConfig', () => {
      it('creates progress with defaults when none exists', async () => {
        const userId = await h.newUser();
        const p = await repo.updateConfig(userId, {
          drinkId: 'tea',
          tzOffset: 60,
        });
        expect(p).toMatchObject({
          userId,
          drinkId: 'tea',
          tzOffset: 60,
          totalXp: 0,
          totalFocusMin: 0,
          todayCount: 0,
          todayFocusMin: 0,
          currentStreak: 0,
          longestStreak: 0,
        });
        expect(p.lastActiveLocalDate).toBeUndefined();
      });

      it('patches only the provided fields', async () => {
        const userId = await h.newUser();
        await repo.applySession(userId, delta());
        await repo.updateConfig(userId, { drinkId: 'mocha' });
        const p = await repo.updateConfig(userId, { tzOffset: 0 });
        expect(p).toMatchObject({
          drinkId: 'mocha',
          tzOffset: 0,
          totalXp: 25,
          lastActiveLocalDate: '2026-07-05',
        });
      });

      it('parallel first-time config calls create a single document', async () => {
        const userId = await h.newUser();
        await Promise.all(
          Array.from({ length: 6 }, (_, i) =>
            repo.updateConfig(userId, { tzOffset: i }),
          ),
        );
        expect(await repo.findByUserId(userId)).not.toBeNull();
      });
    });
  });
}
