import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { MailLog as MailLogEntity } from 'src/modules/labs/mail/domain/mail-log.entity';
import { MailLogRepository } from 'src/modules/labs/mail/domain/mail-log.repository.interface';

type MailLogRow = Prisma.MailLogGetPayload<object>;

/** Append-only: there is intentionally no update or delete. */
@Injectable()
export class PrismaMailLogRepository implements MailLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(log: MailLogEntity): Promise<MailLogEntity> {
    const row = await this.prisma.mailLog.create({
      data: {
        id: newObjectId(),
        to: log.to,
        subject: log.subject,
        body: log.body,
        status: log.status,
        error: log.error,
        sentAt: log.sentAt,
      },
    });
    return this.toEntity(row);
  }

  async findAll(): Promise<MailLogEntity[]> {
    const rows = await this.prisma.mailLog.findMany({
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.toEntity(row));
  }

  async findByRecipient(to: string): Promise<MailLogEntity[]> {
    const rows = await this.prisma.mailLog.findMany({
      where: { to },
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: MailLogRow): MailLogEntity {
    return new MailLogEntity({
      id: row.id,
      to: row.to,
      subject: row.subject,
      body: row.body,
      status: row.status,
      error: row.error ?? undefined,
      sentAt: row.sentAt,
    });
  }
}
