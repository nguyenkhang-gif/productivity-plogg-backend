import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { PrismaTranslationContextRepository } from 'src/modules/labs/translation-context/infrastructure/translation-context.prisma.repository';
import { describeTranslationContextRepositoryContract } from '../contracts/translation-context-repository.contract';

describeTranslationContextRepositoryContract('Prisma', async () => {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  return {
    repo: new PrismaTranslationContextRepository(prisma),
    createUser: async () => {
      const id = newObjectId();
      await prisma.user.create({
        data: {
          id,
          fullName: 'Contract Translation',
          username: `contract_labs_tr_${id}`,
          email: `contract_labs_tr_${id}@example.com`,
        },
      });
      return id;
    },
    cleanup: async () => {
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'contract_labs_tr_' } },
      });
      await prisma.onModuleDestroy();
    },
  };
});
