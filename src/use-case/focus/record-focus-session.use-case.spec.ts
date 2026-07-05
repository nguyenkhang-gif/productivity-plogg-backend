import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RecordFocusSessionUseCase } from './record-focus-session.use-case';
import { USER_PROGRESS_REPOSITORY } from 'src/core/domain/repositories/user-progress.repository.interface';
import {
  DuplicateSessionError,
  FOCUS_SESSION_REPOSITORY,
} from 'src/core/domain/repositories/focus-session.repository.interface';
import { UserProgress } from 'src/core/domain/entities/user-progress.entity';
import { FocusSession } from 'src/core/domain/entities/focus-session.entity';

// Frozen "now": 2026-07-05T10:00:00Z → localDate 2026-07-05 at tzOffset 0
const NOW = new Date('2026-07-05T10:00:00Z');
const TODAY = '2026-07-05';
const YESTERDAY = '2026-07-04';

const DTO = { clientSessionId: 'session-0001', durationMin: 25 };

function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return new UserProgress({
    id: 'p1',
    userId: 'u1',
    totalXp: 100,
    totalFocusMin: 100,
    tzOffset: 0,
    todayCount: 0,
    todayFocusMin: 0,
    lastActiveLocalDate: undefined,
    currentStreak: 0,
    longestStreak: 0,
    ...overrides,
  });
}

describe('RecordFocusSessionUseCase', () => {
  let useCase: RecordFocusSessionUseCase;
  let progressRepo: {
    findByUserId: jest.Mock;
    applySession: jest.Mock;
    updateConfig: jest.Mock;
  };
  let sessionRepo: {
    insertRaw: jest.Mock;
    rollupDaily: jest.Mock;
    rollupWeekly: jest.Mock;
    rollupMonthly: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    progressRepo = {
      findByUserId: jest.fn().mockResolvedValue(null),
      applySession: jest
        .fn()
        .mockImplementation((userId, delta) =>
          Promise.resolve(makeProgress({ userId, ...delta })),
        ),
      updateConfig: jest.fn(),
    };
    sessionRepo = {
      insertRaw: jest
        .fn()
        .mockImplementation((s: FocusSession) =>
          Promise.resolve(new FocusSession({ ...s, id: 'raw1' })),
        ),
      rollupDaily: jest.fn(),
      rollupWeekly: jest.fn(),
      rollupMonthly: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        RecordFocusSessionUseCase,
        { provide: USER_PROGRESS_REPOSITORY, useValue: progressRepo },
        { provide: FOCUS_SESSION_REPOSITORY, useValue: sessionRepo },
      ],
    }).compile();

    useCase = module.get(RecordFocusSessionUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes XP server-side (1 XP per minute) and inserts the raw session', async () => {
    const result = await useCase.execute('u1', DTO);

    expect(sessionRepo.insertRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        clientSessionId: 'session-0001',
        durationMin: 25,
        xpEarned: 25,
        localDate: TODAY,
      }),
    );
    expect(progressRepo.applySession).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ xp: 25, focusMin: 25 }),
    );
    expect(result.alreadyRecorded).toBe(false);
  });

  it('computes localDate in the user timezone (17:30Z + tzOffset 420 → next day)', async () => {
    jest.setSystemTime(new Date('2026-07-05T17:30:00Z'));

    await useCase.execute('u1', { ...DTO, tzOffset: 420 });

    expect(sessionRepo.insertRaw).toHaveBeenCalledWith(
      expect.objectContaining({ localDate: '2026-07-06', xpEarned: 25 }),
    );
  });

  it('falls back to the stored tzOffset when the DTO omits it', async () => {
    jest.setSystemTime(new Date('2026-07-05T17:30:00Z'));
    progressRepo.findByUserId.mockResolvedValue(
      makeProgress({ tzOffset: 420 }),
    );

    await useCase.execute('u1', DTO);

    expect(sessionRepo.insertRaw).toHaveBeenCalledWith(
      expect.objectContaining({ localDate: '2026-07-06' }),
    );
  });

  it('returns alreadyRecorded on duplicate clientSessionId without touching progress', async () => {
    const existing = makeProgress({ totalXp: 500 });
    progressRepo.findByUserId.mockResolvedValue(existing);
    sessionRepo.insertRaw.mockRejectedValue(
      new DuplicateSessionError('session-0001'),
    );

    const result = await useCase.execute('u1', DTO);

    expect(result.alreadyRecorded).toBe(true);
    expect(result.progress).toBe(existing);
    expect(progressRepo.applySession).not.toHaveBeenCalled();
  });

  it('starts a streak of 1 for a new user', async () => {
    await useCase.execute('u1', DTO);

    expect(progressRepo.applySession).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        currentStreak: 1,
        longestStreak: 1,
        todayCount: 1,
        todayFocusMin: 25,
      }),
    );
  });

  it('keeps the streak and increments today counters on a same-day session', async () => {
    progressRepo.findByUserId.mockResolvedValue(
      makeProgress({
        lastActiveLocalDate: TODAY,
        currentStreak: 3,
        longestStreak: 5,
        todayCount: 2,
        todayFocusMin: 50,
      }),
    );

    await useCase.execute('u1', DTO);

    expect(progressRepo.applySession).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        currentStreak: 3,
        longestStreak: 5,
        todayCount: 3,
        todayFocusMin: 75,
      }),
    );
  });

  it('extends the streak when last active was yesterday', async () => {
    progressRepo.findByUserId.mockResolvedValue(
      makeProgress({
        lastActiveLocalDate: YESTERDAY,
        currentStreak: 3,
        longestStreak: 3,
      }),
    );

    await useCase.execute('u1', DTO);

    expect(progressRepo.applySession).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        currentStreak: 4,
        longestStreak: 4,
        todayCount: 1,
        todayFocusMin: 25,
      }),
    );
  });

  it('resets the streak to 1 after a gap, preserving longestStreak', async () => {
    progressRepo.findByUserId.mockResolvedValue(
      makeProgress({
        lastActiveLocalDate: '2026-07-01',
        currentStreak: 6,
        longestStreak: 6,
      }),
    );

    await useCase.execute('u1', DTO);

    expect(progressRepo.applySession).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ currentStreak: 1, longestStreak: 6 }),
    );
  });

  it('rejects when the daily focus-minutes cap would be exceeded', async () => {
    progressRepo.findByUserId.mockResolvedValue(
      makeProgress({ lastActiveLocalDate: TODAY, todayFocusMin: 1430 }),
    );

    await expect(useCase.execute('u1', DTO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sessionRepo.insertRaw).not.toHaveBeenCalled();
    expect(progressRepo.applySession).not.toHaveBeenCalled();
  });

  it('does not apply the cap across different local days', async () => {
    progressRepo.findByUserId.mockResolvedValue(
      makeProgress({ lastActiveLocalDate: YESTERDAY, todayFocusMin: 1430 }),
    );

    const result = await useCase.execute('u1', DTO);

    expect(result.alreadyRecorded).toBe(false);
    expect(progressRepo.applySession).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ todayFocusMin: 25 }),
    );
  });
});
