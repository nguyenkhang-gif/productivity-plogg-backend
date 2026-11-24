import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { PrismaEpubRepository } from 'src/modules/labs/epub/infrastructure/epub.prisma.repository';
import { describeEpubRepositoryContract } from '../contracts/epub-repository.contract';

describeEpubRepositoryContract('Prisma', async () => {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  return {
    repo: new PrismaEpubRepository(prisma),
    createUser: async () => {
      const id = newObjectId();
      await prisma.user.create({
        data: {
          id,
          fullName: 'Contract Epub',
          username: `contract_labs_epub_${id}`,
          email: `contract_labs_epub_${id}@example.com`,
        },
      });
      return id;
    },
    cleanup: async () => {
      // epubs cascade with their users
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'contract_labs_epub_' } },
      });
      await prisma.onModuleDestroy();
    },
  };
});
