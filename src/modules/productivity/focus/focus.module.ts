import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserProgress,
  UserProgressSchema,
} from 'src/modules/productivity/focus/infrastructure/user-progress.schema';
import {
  FocusSessionRaw,
  FocusSessionRawSchema,
} from 'src/modules/productivity/focus/infrastructure/focus-session-raw.schema';
import {
  FocusSessionDaily,
  FocusSessionDailySchema,
} from 'src/modules/productivity/focus/infrastructure/focus-session-daily.schema';
import {
  FocusSessionWeekly,
  FocusSessionWeeklySchema,
} from 'src/modules/productivity/focus/infrastructure/focus-session-weekly.schema';
import {
  FocusSessionMonthly,
  FocusSessionMonthlySchema,
} from 'src/modules/productivity/focus/infrastructure/focus-session-monthly.schema';
import { MongoUserProgressRepository } from 'src/modules/productivity/focus/infrastructure/user-progress.repository';
import { MongoFocusSessionRepository } from 'src/modules/productivity/focus/infrastructure/focus-session.repository';
import { USER_PROGRESS_REPOSITORY } from 'src/modules/productivity/focus/domain/user-progress.repository.interface';
import { FOCUS_SESSION_REPOSITORY } from 'src/modules/productivity/focus/domain/focus-session.repository.interface';
import { FocusController } from 'src/modules/productivity/focus/presentation/focus.controller';
import { RecordFocusSessionUseCase } from 'src/modules/productivity/focus/application/record-focus-session.use-case';
import { GetFocusProgressUseCase } from 'src/modules/productivity/focus/application/get-focus-progress.use-case';
import { UpdateFocusConfigUseCase } from 'src/modules/productivity/focus/application/update-focus-config.use-case';
import { RollupDailyUseCase } from 'src/modules/productivity/focus/application/rollup-daily.use-case';
import { RollupWeeklyUseCase } from 'src/modules/productivity/focus/application/rollup-weekly.use-case';
import { RollupMonthlyUseCase } from 'src/modules/productivity/focus/application/rollup-monthly.use-case';
import { GetFocusReportUseCase } from 'src/modules/productivity/focus/application/get-focus-report.use-case';

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
    GetFocusReportUseCase,
  ],
})
export class FocusModule {}
