import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MailLog,
  MailLogSchema,
} from 'src/modules/labs/mail/infrastructure/mail-log.schema';
import { MongoMailLogRepository } from 'src/modules/labs/mail/infrastructure/mail-log.repository';
import { PrismaMailLogRepository } from 'src/modules/labs/mail/infrastructure/mail-log.prisma.repository';
import {
  MAIL_LOG_REPOSITORY,
  type MailLogRepository,
} from 'src/modules/labs/mail/domain/mail-log.repository.interface';
import { PrismaModule } from 'src/shared/database/prisma.module';
import { backendProvider } from 'src/shared/database/backend-provider';
import { MAIL_SENDER } from 'src/modules/labs/mail/domain/mail-sender.interface';
import { MailService } from './infrastructure/mail.service';
import { MailController } from 'src/modules/labs/mail/presentation/mail.controller';
import { SendMailUseCase } from 'src/modules/labs/mail/application/send-mail.use-case';
import { GetMailLogsUseCase } from 'src/modules/labs/mail/application/get-mail-logs.use-case';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([{ name: MailLog.name, schema: MailLogSchema }]),
  ],
  controllers: [MailController],
  providers: [
    { provide: MAIL_SENDER, useClass: MailService },
    MongoMailLogRepository,
    PrismaMailLogRepository,
    backendProvider<MailLogRepository>(
      MAIL_LOG_REPOSITORY,
      MongoMailLogRepository,
      PrismaMailLogRepository,
    ),
    SendMailUseCase,
    GetMailLogsUseCase,
  ],
  exports: [MAIL_SENDER],
})
export class MailModule {}
