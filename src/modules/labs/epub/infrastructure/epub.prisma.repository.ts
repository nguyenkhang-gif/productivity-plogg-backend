import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { Epub as EpubEntity } from 'src/modules/labs/epub/domain/epub.entity';
import { EpubRepository } from 'src/modules/labs/epub/domain/epub.repository.interface';

type EpubRow = Prisma.EpubGetPayload<object>;

@Injectable()
export class PrismaEpubRepository implements EpubRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: EpubRow): EpubEntity {
    return new EpubEntity({
      id: row.id,
      sampleUrl: row.sampleUrl ?? undefined,
      createdUserId: row.createdUserId,
      properties: row.properties as Record<string, any>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /** Whitelist: only mutable fields; undefined values are left untouched. */
  private toUpdateData(data: Partial<EpubEntity>) {
    return {
      sampleUrl: data.sampleUrl,
      properties: data.properties as Prisma.InputJsonValue | undefined,
    };
  }

  async findById(id: string): Promise<EpubEntity | null> {
    const row = await this.prisma.epub.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : null;
  }

  async create(epub: EpubEntity): Promise<EpubEntity> {
    const row = await this.prisma.epub.create({
      data: {
        id: newObjectId(),
        sampleUrl: epub.sampleUrl,
        createdUserId: epub.createdUserId,
        properties: epub.properties as Prisma.InputJsonValue,
      },
    });
    return this.mapToDomain(row);
  }

  async update(id: string, epub: Partial<EpubEntity>): Promise<EpubEntity> {
    try {
      const row = await this.prisma.epub.update({
        where: { id },
        data: this.toUpdateData(epub),
      });
      return this.mapToDomain(row);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new Error('Epub not found');
      }
      throw error;
    }
  }

  async findAllByUser(userId: string): Promise<EpubEntity[]> {
    const rows = await this.prisma.epub.findMany({
      where: { createdUserId: userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.mapToDomain(row));
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<EpubEntity | null> {
    const row = await this.prisma.epub.findFirst({
      where: { id, createdUserId: userId },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async updateForUser(
    id: string,
    userId: string,
    data: Partial<Pick<EpubEntity, 'sampleUrl' | 'properties'>>,
  ): Promise<EpubEntity | null> {
    // updateMany keeps the owner in the WHERE clause (update() only accepts
    // unique fields), so a foreign epub is never touched.
    const { count } = await this.prisma.epub.updateMany({
      where: { id, createdUserId: userId },
      data: this.toUpdateData(data),
    });
    if (count === 0) return null;
    return this.findByIdForUser(id, userId);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.epub.deleteMany({
      where: { id, createdUserId: userId },
    });
    return count > 0;
  }
}
