import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MailLog,
  MailLogSchema,
} from 'src/infrastructure/databases/schemas/mail-log.schema';
import { MongoMailLogRepository } from 'src/infrastructure/databases/repositories/mail-log.repository';
import { MAIL_LOG_REPOSITORY } from 'src/core/domain/repositories/mail-log.repository.interface';
import { MAIL_SENDER } from 'src/core/domain/interfaces/mail-sender.interface';
import { MailService } from './mail.service';
import { MailController } from 'src/presentation/controllers/mail.controller';
import { SendMailUseCase } from 'src/use-case/mail/send-mail.use-case';
import { GetMailLogsUseCase } from 'src/use-case/mail/get-mail-logs.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MailLog.name, schema: MailLogSchema }]),
  ],
  controllers: [MailController],
  providers: [
    { provide: MAIL_SENDER, useClass: MailService },
    { provide: MAIL_LOG_REPOSITORY, useClass: MongoMailLogRepository },
    SendMailUseCase,
    GetMailLogsUseCase,
  ],
  exports: [MAIL_SENDER],
})
export class MailModule {}
