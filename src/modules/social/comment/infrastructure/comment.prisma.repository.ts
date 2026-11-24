import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import {
  CommentRepository,
  PaginatedComments,
} from 'src/modules/social/comment/domain/comment.repository.interface';
import { Comment as CommentEntity } from 'src/modules/social/comment/domain/comment.entity';
import { isRecordNotFound } from 'src/modules/social/shared/prisma-errors';

const WITH_AUTHOR = {
  author: {
    select: { id: true, fullName: true, username: true, profilePic: true },
  },
} satisfies Prisma.CommentInclude;

type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: typeof WITH_AUTHOR;
}>;

@Injectable()
export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: CommentWithAuthor): CommentEntity {
    return new CommentEntity({
      id: row.id,
      postId: row.postId,
      authorId: row.authorId,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      iconUrl: row.iconUrl ?? undefined,
      author: row.author
        ? {
            id: row.author.id,
            fullName: row.author.fullName,
            username: row.author.username,
            profilePic: row.author.profilePic ?? undefined,
          }
        : undefined,
    });
  }

  async findById(id: string): Promise<CommentEntity | null> {
    const row = await this.prisma.comment.findUnique({
      where: { id },
      include: WITH_AUTHOR,
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findByPost(
    postId: string,
    page: number,
    limit: number,
    excludeAuthorIds: string[] = [],
  ): Promise<PaginatedComments> {
    const where: Prisma.CommentWhereInput = {
      postId,
      ...(excludeAuthorIds.length > 0
        ? { authorId: { notIn: excludeAuthorIds } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: WITH_AUTHOR,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.mapToDomain(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(comment: CommentEntity): Promise<CommentEntity> {
    const row = await this.prisma.comment.create({
      data: {
        id: newObjectId(),
        postId: comment.postId,
        authorId: comment.authorId,
        content: comment.content,
        iconUrl: comment.iconUrl,
      },
      include: WITH_AUTHOR,
    });
    return this.mapToDomain(row);
  }

  /** Like Mongo, the result carries no `author` sub-object. */
  async update(id: string, content: string): Promise<CommentEntity> {
    try {
      const row = await this.prisma.comment.update({
        where: { id },
        data: { content },
      });
      return new CommentEntity({
        id: row.id,
        postId: row.postId,
        authorId: row.authorId,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch (err) {
      if (isRecordNotFound(err))
        throw new NotFoundException('Comment not found');
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.comment.delete({ where: { id } });
    } catch (err) {
      if (isRecordNotFound(err))
        throw new NotFoundException('Comment not found');
      throw err;
    }
  }
}
