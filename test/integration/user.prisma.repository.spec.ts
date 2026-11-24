import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { PrismaUserRepository } from 'src/modules/identity/user/infrastructure/user.prisma.repository';
import type { UserRelations } from 'src/modules/identity/user/domain/user-relations.port';
import { describeUserRepositoryContract } from '../contracts/user-repository.contract';

describeUserRepositoryContract('Prisma', async () => {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const friendships: Array<[string, string]> = [];
  const postCounts = new Map<string, number>();
  const relations: UserRelations = {
    friendIdsOf: async (userId) =>
      friendships
        .filter(([a, b]) => a === userId || b === userId)
        .map(([a, b]) => (a === userId ? b : a)),
    postCountsByAuthor: async (ids) =>
      new Map(
        ids
          .filter((id) => postCounts.has(id))
          .map((id) => [id, postCounts.get(id)!]),
      ),
  };

  return {
    repo: new PrismaUserRepository(prisma, relations),
    seed: {
      friendship: async (a, b) => {
        friendships.push([a, b]);
      },
      posts: async (authorId, count) => {
        postCounts.set(authorId, count);
      },
    },
    cleanup: async () => {
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'contract_' } },
      });
      await prisma.onModuleDestroy();
    },
  };
});
