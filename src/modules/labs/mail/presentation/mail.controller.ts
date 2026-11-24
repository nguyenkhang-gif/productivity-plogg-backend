import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { RolesGuard } from 'src/shared/security/roles.guard';
import { Roles } from 'src/shared/security/roles.decorator';
import { SendMailDto } from 'src/modules/labs/mail/application/dto/mail.dto';
import { SendMailUseCase } from 'src/modules/labs/mail/application/send-mail.use-case';
import { GetMailLogsUseCase } from 'src/modules/labs/mail/application/get-mail-logs.use-case';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/mail')
export class MailController {
  constructor(
    private readonly sendMailUseCase: SendMailUseCase,
    private readonly getMailLogsUseCase: GetMailLogsUseCase,
  ) {}

  @Post('send')
  async sendEmail(@Body() body: SendMailDto) {
    const { to, subject, text } = body;
    const log = await this.sendMailUseCase.execute(to, subject, text);
    if (log.status === 'failed') {
      return { success: false, error: log.error };
    }
    return { success: true, message: 'Email sent successfully!' };
  }

  @Get('logs')
  async getLogs(@Query('to') to?: string) {
    return this.getMailLogsUseCase.execute(to);
  }
}
