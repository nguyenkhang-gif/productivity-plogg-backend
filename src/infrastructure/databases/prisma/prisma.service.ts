import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any) as unknown as PrismaClient;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma = createPrismaClient();

  get budgetCategory() { return this.prisma.budgetCategory; }
  get budgetTransaction() { return this.prisma.budgetTransaction; }

  async onModuleInit() { await (this.prisma as any).$connect(); }
  async onModuleDestroy() { await (this.prisma as any).$disconnect(); }
}
