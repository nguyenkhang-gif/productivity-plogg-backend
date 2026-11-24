import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { PrismaVaultRepository } from 'src/modules/productivity/vault/infrastructure/vault.prisma.repository';
import { describeVaultRepositoryContract } from '../contracts/vault-repository.contract';

async function boot() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const userIds: string[] = [];
  const newUser = async () => {
    const id = newObjectId();
    userIds.push(id);
    await prisma.user.create({
      data: {
        id,
        fullName: `Prod Test ${id}`,
        username: `prodtest_${id}`,
        email: `prodtest_${id}@example.com`,
      },
    });
    return id;
  };
  const cleanup = async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.onModuleDestroy();
  };
  return { prisma, newUser, cleanup };
}

describeVaultRepositoryContract('Prisma', async () => {
  const { prisma, newUser, cleanup } = await boot();
  return { repo: new PrismaVaultRepository(prisma), newUser, cleanup };
});
