import 'dotenv/config';
import { PrismaService } from 'src/shared/database/prisma.service';
import { MongoMigrationSource } from './mongo-source';
import { MIGRATORS } from './registry';
import { formatReport, hasFailures, runMigrators } from './migrator';

function parseArgs(argv: string[]) {
  const opts: { only?: string[]; dryRun: boolean; batchSize: number } = {
    dryRun: false,
    batchSize: 500,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg.startsWith('--only=')) {
      opts.only = arg
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--batch=')) {
      const n = Number(arg.slice('--batch='.length));
      if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid ${arg}`);
      opts.batchSize = n;
    } else {
      throw new Error(`Unknown argument ${arg}`);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGO_DB_URI;
  if (!mongoUri) throw new Error('MONGO_DB_URI is not set');
  if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is not set');

  const source = await MongoMigrationSource.connect(mongoUri);
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  try {
    const results = await runMigrators(MIGRATORS, source, prisma, {
      ...opts,
      log: (line) => console.log(line),
    });
    console.log(`\n${formatReport(results)}`);
    if (hasFailures(results)) process.exitCode = 1;
  } finally {
    await source.close();
    await prisma.onModuleDestroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
