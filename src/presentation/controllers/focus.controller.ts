import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import {
  CreateFocusSessionDto,
  FocusReportQueryDto,
  UpdateFocusConfigDto,
} from 'src/core/dtos/focus.dto';
import { RecordFocusSessionUseCase } from 'src/use-case/focus/record-focus-session.use-case';
import { GetFocusProgressUseCase } from 'src/use-case/focus/get-focus-progress.use-case';
import { UpdateFocusConfigUseCase } from 'src/use-case/focus/update-focus-config.use-case';
import { GetFocusReportUseCase } from 'src/use-case/focus/get-focus-report.use-case';

@UseGuards(JwtAuthGuard)
@Controller('api/focus')
export class FocusController {
  constructor(
    private readonly recordSession: RecordFocusSessionUseCase,
    private readonly getProgress: GetFocusProgressUseCase,
    private readonly updateConfig: UpdateFocusConfigUseCase,
    private readonly getReport: GetFocusReportUseCase,
  ) {}

  @Get('progress')
  progress(@Req() req) {
    return this.getProgress.execute(req.user.userId);
  }

  @Get('report')
  report(@Query() query: FocusReportQueryDto, @Req() req) {
    return this.getReport.execute(req.user.userId, query);
  }

  @Post('session')
  session(@Body() body: CreateFocusSessionDto, @Req() req) {
    return this.recordSession.execute(req.user.userId, body);
  }

  @Patch('config')
  config(@Body() body: UpdateFocusConfigDto, @Req() req) {
    return this.updateConfig.execute(req.user.userId, body);
  }
}
