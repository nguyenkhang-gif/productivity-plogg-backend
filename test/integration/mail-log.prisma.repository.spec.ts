import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { PrismaMailLogRepository } from 'src/modules/labs/mail/infrastructure/mail-log.prisma.repository';
import { describeMailLogRepositoryContract } from '../contracts/mail-log-repository.contract';

describeMailLogRepositoryContract('Prisma', async () => {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  return {
    repo: new PrismaMailLogRepository(prisma),
    cleanup: async () => {
      await prisma.mailLog.deleteMany({
        where: { to: { startsWith: 'contract_' } },
      });
      await prisma.onModuleDestroy();
    },
  };
});
