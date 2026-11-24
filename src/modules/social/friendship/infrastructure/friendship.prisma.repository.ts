import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { FriendshipRepository } from 'src/modules/social/friendship/domain/friendship.repository.interface';
import {
  Friendship as FriendshipEntity,
  FriendInfo,
  FriendshipStatus,
} from 'src/modules/social/friendship/domain/friendship.entity';
import {
  isRecordNotFound,
  isUniqueViolation,
} from 'src/modules/social/shared/prisma-errors';

const USER_CARD = {
  select: { id: true, fullName: true, username: true, profilePic: true },
} as const;

type Row = Prisma.FriendshipGetPayload<object>;
type RowWithUsers = Prisma.FriendshipGetPayload<{
  include: { user: typeof USER_CARD; friend: typeof USER_CARD };
}>;

const toFriendInfo = (u: {
  id: string;
  fullName: string;
  username: string;
  profilePic: string | null;
}): FriendInfo => ({
  id: u.id,
  fullName: u.fullName,
  username: u.username,
  profilePic: u.profilePic ?? undefined,
});

// Mongo returns edges in insertion order; keep that stable here.
const INSERTION_ORDER = [
  { createdAt: 'asc' },
  { id: 'asc' },
] satisfies Prisma.FriendshipOrderByWithRelationInput[];

@Injectable()
export class PrismaFriendshipRepository implements FriendshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: Row, friendInfo?: FriendInfo): FriendshipEntity {
    return new FriendshipEntity({
      id: row.id,
      userId: row.userId,
      friendId: row.friendId,
      status: row.status as FriendshipStatus,
      friendInfo,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: string): Promise<FriendshipEntity | null> {
    const row = await this.prisma.friendship.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : null;
  }

  async findByPair(
    userId: string,
    friendId: string,
  ): Promise<FriendshipEntity | null> {
    const row = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
      orderBy: INSERTION_ORDER,
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findBlocksInvolving(userId: string): Promise<FriendshipEntity[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'blocked',
        OR: [{ userId }, { friendId: userId }],
      },
      orderBy: INSERTION_ORDER,
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  // friendInfo = the other person (not the current user)
  async findFriends(userId: string): Promise<FriendshipEntity[]> {
    const rows: RowWithUsers[] = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId }, { friendId: userId }],
      },
      include: { user: USER_CARD, friend: USER_CARD },
      orderBy: INSERTION_ORDER,
    });
    return rows.map((r) =>
      this.mapToDomain(
        r,
        toFriendInfo(r.userId === userId ? r.friend : r.user),
      ),
    );
  }

  // friendInfo = the sender (userId)
  async findPendingReceived(userId: string): Promise<FriendshipEntity[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { friendId: userId, status: 'pending' },
      include: { user: USER_CARD },
      orderBy: INSERTION_ORDER,
    });
    return rows.map((r) => this.mapToDomain(r, toFriendInfo(r.user)));
  }

  // friendInfo = the receiver (friendId)
  async findPendingSent(userId: string): Promise<FriendshipEntity[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { userId, status: 'pending' },
      include: { friend: USER_CARD },
      orderBy: INSERTION_ORDER,
    });
    return rows.map((r) => this.mapToDomain(r, toFriendInfo(r.friend)));
  }

  async create(friendship: FriendshipEntity): Promise<FriendshipEntity> {
    try {
      const row = await this.prisma.friendship.create({
        data: {
          id: newObjectId(),
          userId: friendship.userId,
          friendId: friendship.friendId,
          status: friendship.status,
        },
      });
      return this.mapToDomain(row);
    } catch (err) {
      // (userId, friendId) or the reverse pair already has an edge.
      if (isUniqueViolation(err))
        throw new ConflictException('Friendship already exists');
      throw err;
    }
  }

  async updateStatus(
    id: string,
    status: FriendshipStatus,
  ): Promise<FriendshipEntity> {
    try {
      const row = await this.prisma.friendship.update({
        where: { id },
        data: { status },
      });
      return this.mapToDomain(row);
    } catch (err) {
      if (isRecordNotFound(err)) throw new Error('Friendship not found');
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.friendship.deleteMany({ where: { id } });
  }
}
