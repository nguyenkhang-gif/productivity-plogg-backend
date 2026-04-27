import { MailLog } from '../entities/mail-log.entity';

export const MAIL_LOG_REPOSITORY = 'MAIL_LOG_REPOSITORY';

export interface MailLogRepository {
  save(log: MailLog): Promise<MailLog>;
  findAll(): Promise<MailLog[]>;
  findByRecipient(to: string): Promise<MailLog[]>;
}
