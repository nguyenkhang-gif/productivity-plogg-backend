import { Inject, Injectable } from '@nestjs/common';
import {
  FOCUS_SESSION_REPOSITORY,
  FocusSessionRepository,
} from 'src/core/domain/repositories/focus-session.repository.interface';
import { FocusReportQueryDto } from 'src/core/dtos/focus.dto';

export interface ReportCell {
  period: string; // "YYYY-MM-DD"
  sessionsCount: number;
  totalFocusMin: number;
  totalXp: number;
}

export interface FocusReport {
  month: string;
  cells: ReportCell[];
}

@Injectable()
export class GetFocusReportUseCase {
  constructor(
    @Inject(FOCUS_SESSION_REPOSITORY)
    private readonly sessionRepo: FocusSessionRepository,
  ) {}

  /**
   * Calendar report aggregated on the fly from raw sessions — covers the
   * raw TTL window (30 days). Days without focus have no cell. When data
   * grows, switch the read to the rollup collections; the response shape
   * stays the same so the frontend is unaffected.
   */
  async execute(
    userId: string,
    query: FocusReportQueryDto,
  ): Promise<FocusReport> {
    const rollups = await this.sessionRepo.aggregateDailyFromRaw(
      userId,
      `${query.month}-01`,
      `${query.month}-31`,
    );

    return {
      month: query.month,
      cells: rollups.map((r) => ({
        period: r.periodKey,
        sessionsCount: r.sessionsCount,
        totalFocusMin: r.totalFocusMin,
        totalXp: r.totalXp,
      })),
    };
  }
}
