import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
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
