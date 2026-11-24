import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { BookmarkRepository } from 'src/modules/social/bookmark/domain/bookmark.repository.interface';

@Injectable()
export class PrismaBookmarkRepository implements BookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent: ON CONFLICT DO NOTHING on (userId, postId). */
  async upsert(userId: string, postId: string): Promise<void> {
    await this.prisma.bookmark.createMany({
      data: [{ id: newObjectId(), userId, postId }],
      skipDuplicates: true,
    });
  }

  async delete(userId: string, postId: string): Promise<void> {
    await this.prisma.bookmark.deleteMany({ where: { userId, postId } });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.bookmark.count({ where: { userId } });
  }

  async getBookmarkedPostIds(
    userId: string,
    postIds: string[],
  ): Promise<Set<string>> {
    if (!postIds.length) return new Set();
    const rows = await this.prisma.bookmark.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    return new Set(rows.map((r) => r.postId));
  }
}
