import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { UserRelations } from 'src/modules/identity/user/domain/user-relations.port';

/** Postgres counterpart of MongoUserRelations (same semantics, same inputs). */
@Injectable()
export class PrismaUserRelations implements UserRelations {
  constructor(private readonly prisma: PrismaService) {}

  /** Every user sharing an edge with `userId`, whatever its status (as in Mongo). */
  async friendIdsOf(userId: string): Promise<string[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ userId }, { friendId: userId }] },
      select: { userId: true, friendId: true },
    });
    const ids = new Set<string>();
    for (const f of rows) {
      ids.add(f.userId);
      ids.add(f.friendId);
    }
    ids.delete(userId);
    return [...ids];
  }

  /** Counts every post of the author (any visibility, status, type). */
  async postCountsByAuthor(authorIds: string[]): Promise<Map<string, number>> {
    if (authorIds.length === 0) return new Map();
    const rows = await this.prisma.post.groupBy({
      by: ['authorId'],
      where: { authorId: { in: authorIds } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.authorId, r._count._all]));
  }
}
