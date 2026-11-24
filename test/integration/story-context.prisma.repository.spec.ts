import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { PrismaStoryContextRepository } from 'src/modules/labs/story-context/infrastructure/story-context.prisma.repository';
import { describeStoryContextRepositoryContract } from '../contracts/story-context-repository.contract';

describeStoryContextRepositoryContract('Prisma', async () => {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  return {
    repo: new PrismaStoryContextRepository(prisma),
    createUser: async () => {
      const id = newObjectId();
      await prisma.user.create({
        data: {
          id,
          fullName: 'Contract Story',
          username: `contract_labs_story_${id}`,
          email: `contract_labs_story_${id}@example.com`,
        },
      });
      return id;
    },
    cleanup: async () => {
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'contract_labs_story_' } },
      });
      await prisma.onModuleDestroy();
    },
  };
});
