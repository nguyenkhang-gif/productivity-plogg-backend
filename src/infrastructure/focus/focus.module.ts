import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserProgress,
  UserProgressSchema,
} from 'src/infrastructure/databases/schemas/user-progress.schema';
import {
  FocusSessionRaw,
  FocusSessionRawSchema,
} from 'src/infrastructure/databases/schemas/focus-session-raw.schema';
import {
  FocusSessionDaily,
  FocusSessionDailySchema,
} from 'src/infrastructure/databases/schemas/focus-session-daily.schema';
import {
  FocusSessionWeekly,
  FocusSessionWeeklySchema,
} from 'src/infrastructure/databases/schemas/focus-session-weekly.schema';
import {
  FocusSessionMonthly,
  FocusSessionMonthlySchema,
} from 'src/infrastructure/databases/schemas/focus-session-monthly.schema';
import { MongoUserProgressRepository } from 'src/infrastructure/databases/repositories/user-progress.repository';
import { MongoFocusSessionRepository } from 'src/infrastructure/databases/repositories/focus-session.repository';
import { USER_PROGRESS_REPOSITORY } from 'src/core/domain/repositories/user-progress.repository.interface';
import { FOCUS_SESSION_REPOSITORY } from 'src/core/domain/repositories/focus-session.repository.interface';
import { FocusController } from 'src/presentation/controllers/focus.controller';
import { RecordFocusSessionUseCase } from 'src/use-case/focus/record-focus-session.use-case';
import { GetFocusProgressUseCase } from 'src/use-case/focus/get-focus-progress.use-case';
import { UpdateFocusConfigUseCase } from 'src/use-case/focus/update-focus-config.use-case';
import { RollupDailyUseCase } from 'src/use-case/focus/rollup-daily.use-case';
import { RollupWeeklyUseCase } from 'src/use-case/focus/rollup-weekly.use-case';
import { RollupMonthlyUseCase } from 'src/use-case/focus/rollup-monthly.use-case';

// Rollup use-cases are provided for manual invocation; the cron scheduler
// (FocusRollupScheduler) is deferred — see plan Step 5
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProgress.name, schema: UserProgressSchema },
      { name: FocusSessionRaw.name, schema: FocusSessionRawSchema },
      { name: FocusSessionDaily.name, schema: FocusSessionDailySchema },
      { name: FocusSessionWeekly.name, schema: FocusSessionWeeklySchema },
      { name: FocusSessionMonthly.name, schema: FocusSessionMonthlySchema },
    ]),
  ],
  controllers: [FocusController],
  providers: [
    {
      provide: USER_PROGRESS_REPOSITORY,
      useClass: MongoUserProgressRepository,
    },
    {
      provide: FOCUS_SESSION_REPOSITORY,
      useClass: MongoFocusSessionRepository,
    },
    RecordFocusSessionUseCase,
    GetFocusProgressUseCase,
    UpdateFocusConfigUseCase,
    RollupDailyUseCase,
    RollupWeeklyUseCase,
    RollupMonthlyUseCase,
  ],
})
export class FocusModule {}
