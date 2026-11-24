export type MailStatus = 'sent' | 'failed';

export class MailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  status: MailStatus;
  error?: string;
  sentAt: Date;

  constructor(partial: Partial<MailLog>) {
    Object.assign(this, partial);
  }
}
