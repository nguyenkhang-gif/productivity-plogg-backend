import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { escapeLike } from 'src/shared/database/like';
import { User as UserEntity } from 'src/modules/identity/user/domain/user.entity';
import {
  FindAllUsersFilter,
  FindAllUsersResult,
  UserRepository,
} from 'src/modules/identity/user/domain/user.repository.interface';
import {
  USER_RELATIONS,
  type UserRelations,
} from 'src/modules/identity/user/domain/user-relations.port';

type UserRow = Prisma.UserGetPayload<object>;
type PartialRow = Partial<UserRow> & { id: string };

const PUBLIC_CARD_SELECT = {
  id: true,
  fullName: true,
  username: true,
  profilePic: true,
} satisfies Prisma.UserSelect;

const ADMIN_LIST_OMIT = {
  passwordHash: true,
  resetPasswordToken: true,
  googleId: true,
  facebookId: true,
} satisfies Prisma.UserOmit;

const orUndefined = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(USER_RELATIONS) private readonly relations: UserRelations,
  ) {}

  /** Rows from select/omit queries are partial, like Mongo projections. */
  private mapToDomain(row: PartialRow): UserEntity {
    return new UserEntity({
      id: row.id,
      fullName: row.fullName,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      gender: row.gender,
      profilePic: orUndefined(row.profilePic),
      membership: row.membership,
      role: row.role as UserEntity['role'],
      isPrivate: row.isPrivate,
      resetPasswordToken: orUndefined(row.resetPasswordToken),
      googleId: orUndefined(row.googleId),
      facebookId: orUndefined(row.facebookId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private async findOneBy(
    where: Prisma.UserWhereInput,
  ): Promise<UserEntity | null> {
    const row = await this.prisma.user.findFirst({ where });
    return row ? this.mapToDomain(row) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : null;
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOneBy({ email });
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.findOneBy({ username });
  }

  findByGoogleId(googleId: string): Promise<UserEntity | null> {
    return this.findOneBy({ googleId });
  }

  findByFacebookId(facebookId: string): Promise<UserEntity | null> {
    return this.findOneBy({ facebookId });
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const row = await this.prisma.user.create({
      data: {
        id: newObjectId(),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        gender: user.gender as UserRow['gender'] | undefined,
        profilePic: user.profilePic,
        googleId: user.googleId,
        facebookId: user.facebookId,
      },
    });
    return this.mapToDomain(row);
  }

  async update(
    id: string,
    userUpdate: Partial<UserEntity>,
  ): Promise<UserEntity> {
    const {
      fullName,
      username,
      email,
      passwordHash,
      gender,
      profilePic,
      membership,
      role,
      isPrivate,
      resetPasswordToken,
      googleId,
      facebookId,
    } = userUpdate;
    try {
      const row = await this.prisma.user.update({
        where: { id },
        data: {
          fullName,
          username,
          email,
          passwordHash,
          gender: gender as UserRow['gender'] | undefined,
          profilePic,
          membership: membership as UserRow['membership'] | undefined,
          role: role as UserRow['role'] | undefined,
          isPrivate,
          resetPasswordToken,
          googleId,
          facebookId,
        },
      });
      return this.mapToDomain(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new Error('User not found');
      }
      throw error;
    }
  }

  async search(
    query: string,
    excludeUserId: string,
    excludeIds: string[] = [],
  ): Promise<UserEntity[]> {
    const term = escapeLike(query);
    const rows = await this.prisma.user.findMany({
      where: {
        id: { notIn: [excludeUserId, ...excludeIds] },
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { fullName: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: PUBLIC_CARD_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 20,
    });
    return rows.map((row) => this.mapToDomain(row));
  }

  async findSuggestions(
    currentUserId: string,
    limit: number,
  ): Promise<UserEntity[]> {
    const friendIds = await this.relations.friendIdsOf(currentUserId);
    const rows = await this.prisma.user.findMany({
      where: { id: { notIn: [currentUserId, ...friendIds] }, isPrivate: false },
      select: PUBLIC_CARD_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    return rows.map((row) => this.mapToDomain(row));
  }

  async findAll(filter: FindAllUsersFilter): Promise<FindAllUsersResult> {
    const { search, role, membership, page, limit } = filter;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      const term = escapeLike(search);
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { username: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role as UserRow['role'];
    if (membership) where.membership = membership as UserRow['membership'];

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        omit: ADMIN_LIST_OMIT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const postCounts = await this.relations.postCountsByAuthor(
      rows.map((row) => row.id),
    );

    return {
      data: rows.map((row) => {
        const user = this.mapToDomain(row);
        user.postCount = postCounts.get(user.id) ?? 0;
        return user;
      }),
      total,
      page,
      limit,
    };
  }
}
