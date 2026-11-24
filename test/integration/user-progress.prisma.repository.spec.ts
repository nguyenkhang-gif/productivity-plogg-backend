import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { PrismaUserProgressRepository } from 'src/modules/productivity/focus/infrastructure/user-progress.prisma.repository';
import { describeUserProgressRepositoryContract } from '../contracts/user-progress-repository.contract';

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

describeUserProgressRepositoryContract('Prisma', async () => {
  const { prisma, newUser, cleanup } = await boot();
  return { repo: new PrismaUserProgressRepository(prisma), newUser, cleanup };
});
