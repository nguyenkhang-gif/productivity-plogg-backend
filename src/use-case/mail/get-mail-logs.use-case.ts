import { Inject, Injectable } from '@nestjs/common';
import { MailLog } from 'src/core/domain/entities/mail-log.entity';
import {
  MAIL_LOG_REPOSITORY,
  MailLogRepository,
} from 'src/core/domain/repositories/mail-log.repository.interface';

@Injectable()
export class GetMailLogsUseCase {
  constructor(
    @Inject(MAIL_LOG_REPOSITORY)
    private readonly mailLogRepository: MailLogRepository,
  ) {}

  async execute(to?: string): Promise<MailLog[]> {
    if (to) {
      return this.mailLogRepository.findByRecipient(to);
    }
    return this.mailLogRepository.findAll();
  }
}
