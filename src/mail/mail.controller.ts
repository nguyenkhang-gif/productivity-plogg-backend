import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('api/mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async sendEmail(@Body() body: { to: string; subject: string; text: string }) {
    const { to, subject, text } = body;

    try {
      await this.mailService.sendMail(to, subject, text);
      return { success: true, message: 'Email sent successfully!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
