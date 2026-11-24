export const MAIL_SENDER = 'MAIL_SENDER';

export interface IMailSender {
  sendMail(to: string, subject: string, htmlContent: string): Promise<void>;
}
