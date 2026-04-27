import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { SendMailDto } from 'src/core/dtos/mail.dto';
import { SendMailUseCase } from 'src/use-case/mail/send-mail.use-case';
import { GetMailLogsUseCase } from 'src/use-case/mail/get-mail-logs.use-case';

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
