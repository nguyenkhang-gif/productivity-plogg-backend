import { Inject, Injectable } from '@nestjs/common';
import { MailLog } from 'src/modules/labs/mail/domain/mail-log.entity';
import {
  MAIL_SENDER,
  IMailSender,
} from 'src/modules/labs/mail/domain/mail-sender.interface';
import {
  MAIL_LOG_REPOSITORY,
  MailLogRepository,
} from 'src/modules/labs/mail/domain/mail-log.repository.interface';

@Injectable()
export class SendMailUseCase {
  constructor(
    @Inject(MAIL_SENDER)
    private readonly mailSender: IMailSender,
    @Inject(MAIL_LOG_REPOSITORY)
    private readonly mailLogRepository: MailLogRepository,
  ) {}

  async execute(to: string, subject: string, body: string): Promise<MailLog> {
    const log = new MailLog({ to, subject, body, sentAt: new Date() });

    try {
      await this.mailSender.sendMail(to, subject, body);
      log.status = 'sent';
    } catch (error) {
      log.status = 'failed';
      log.error = error.message;
    }

    return this.mailLogRepository.save(log);
  }
}
