import { Injectable } from '@nestjs/common';
import { Reaction as ReactionRow } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { ReactionRepository } from 'src/modules/social/reaction/domain/reaction.repository.interface';
import { Reaction as ReactionEntity } from 'src/modules/social/reaction/domain/reaction.entity';

@Injectable()
export class PrismaReactionRepository implements ReactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: ReactionRow): ReactionEntity {
    return new ReactionEntity({
      id: row.id,
      postId: row.postId,
      userId: row.userId,
      type: row.type,
      icon: row.icon ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findByPostAndUser(
    postId: string,
    userId: string,
  ): Promise<ReactionEntity | null> {
    const row = await this.prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return row ? this.mapToDomain(row) : null;
  }

  /** One reaction per (post, user); an undefined icon leaves the stored one alone. */
  async save(reaction: ReactionEntity): Promise<ReactionEntity> {
    const row = await this.prisma.reaction.upsert({
      where: {
        postId_userId: { postId: reaction.postId, userId: reaction.userId },
      },
      create: {
        id: newObjectId(),
        postId: reaction.postId,
        userId: reaction.userId,
        type: reaction.type,
        icon: reaction.icon,
      },
      update: { type: reaction.type, icon: reaction.icon },
    });
    return this.mapToDomain(row);
  }

  async deleteByPostAndUser(postId: string, userId: string): Promise<void> {
    await this.prisma.reaction.deleteMany({ where: { postId, userId } });
  }
}
