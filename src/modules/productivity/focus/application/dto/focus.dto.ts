import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateFocusSessionDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 64)
  clientSessionId: string;

  @IsInt()
  @Min(1)
  @Max(180)
  durationMin: number;

  /** Minutes east of UTC (e.g. Vietnam = +420 = -getTimezoneOffset()). */
  @IsOptional()
  @IsInt()
  @Min(-720)
  @Max(840)
  tzOffset?: number;
}

export class FocusReportQueryDto {
  /** Calendar month to report, e.g. "2026-07". */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' })
  month: string;
}

export class UpdateFocusConfigDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  drinkId?: string;

  @IsOptional()
  @IsInt()
  @Min(-720)
  @Max(840)
  tzOffset?: number;
}
