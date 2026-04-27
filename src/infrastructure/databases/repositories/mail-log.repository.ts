import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MailLog as MailLogEntity } from 'src/core/domain/entities/mail-log.entity';
import { MailLogRepository } from 'src/core/domain/repositories/mail-log.repository.interface';
import { MailLog, MailLogDocument } from '../schemas/mail-log.schema';

@Injectable()
export class MongoMailLogRepository implements MailLogRepository {
  constructor(
    @InjectModel(MailLog.name) private readonly model: Model<MailLogDocument>,
  ) {}

  async save(log: MailLogEntity): Promise<MailLogEntity> {
    const created = await this.model.create({
      to: log.to,
      subject: log.subject,
      body: log.body,
      status: log.status,
      error: log.error,
      sentAt: log.sentAt,
    });
    return this.toEntity(created);
  }

  async findAll(): Promise<MailLogEntity[]> {
    const docs = await this.model.find().sort({ sentAt: -1 }).exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByRecipient(to: string): Promise<MailLogEntity[]> {
    const docs = await this.model.find({ to }).sort({ sentAt: -1 }).exec();
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: MailLogDocument): MailLogEntity {
    return new MailLogEntity({
      id: doc._id.toString(),
      to: doc.to,
      subject: doc.subject,
      body: doc.body,
      status: doc.status as 'sent' | 'failed',
      error: doc.error,
      sentAt: doc.sentAt,
    });
  }
}
