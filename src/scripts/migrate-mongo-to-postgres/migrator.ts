import type { PrismaClient } from '../../../generated/prisma/client';

/**
 * Returned by `upsertBatch` when it left rows out because they reference
 * records that do not exist in Postgres (e.g. a comment whose post was
 * deleted). One reason string per skipped row; the runner counts them as
 * skipped, not written, so verification still balances.
 */
export interface BatchResult {
  skipped?: string[];
}

export interface CollectionMigrator<TDoc = any, TRow = any> {
  /** Unique key used by `--only` and `dependsOn`. */
  name: string;
  /** Source Mongo collection name. */
  collection: string;
  dependsOn: string[];
  /** Return null to skip a document that cannot be represented. */
  transform(doc: TDoc): TRow | null;
  /** Must be idempotent: re-running with the same rows yields the same table. */
  upsertBatch(prisma: PrismaClient, rows: TRow[]): Promise<void | BatchResult>;
  countTarget(prisma: PrismaClient): Promise<number>;
}

export interface MigrationSource {
  count(collection: string): Promise<number>;
  read(collection: string, batchSize: number): AsyncIterable<any[]>;
}

export interface MigrationStats {
  name: string;
  read: number;
  written: number;
  skipped: number;
  /** Why rows were skipped inside `upsertBatch` (reason -> count). */
  skipReasons?: Record<string, number>;
  failed: number;
  sourceCount: number;
  targetCount: number | null;
  verified: boolean | null;
  errors: string[];
}

export interface RunOptions {
  only?: string[];
  dryRun?: boolean;
  batchSize?: number;
  log?: (line: string) => void;
}

const MAX_ERRORS_KEPT = 20;

export function orderMigrators(
  migrators: CollectionMigrator[],
  only?: string[],
): CollectionMigrator[] {
  const byName = new Map(migrators.map((m) => [m.name, m]));
  for (const name of only ?? []) {
    if (!byName.has(name)) {
      throw new Error(
        `Unknown migrator "${name}". Known: ${[...byName.keys()].join(', ')}`,
      );
    }
  }

  const ordered: CollectionMigrator[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (m: CollectionMigrator) => {
    const s = state.get(m.name);
    if (s === 'done') return;
    if (s === 'visiting') {
      throw new Error(`Circular dependency involving "${m.name}"`);
    }
    state.set(m.name, 'visiting');
    for (const dep of m.dependsOn) {
      const depMigrator = byName.get(dep);
      if (!depMigrator) {
        throw new Error(`"${m.name}" depends on unknown migrator "${dep}"`);
      }
      visit(depMigrator);
    }
    state.set(m.name, 'done');
    ordered.push(m);
  };
  migrators.forEach(visit);

  return only?.length ? ordered.filter((m) => only.includes(m.name)) : ordered;
}

function recordSkips(
  stats: MigrationStats,
  rowCount: number,
  result: void | BatchResult,
) {
  const reasons = (result as BatchResult | undefined)?.skipped ?? [];
  stats.written += rowCount - reasons.length;
  stats.skipped += reasons.length;
  if (reasons.length) {
    stats.skipReasons ??= {};
    for (const reason of reasons) {
      stats.skipReasons[reason] = (stats.skipReasons[reason] ?? 0) + 1;
    }
  }
}

function recordFailure(stats: MigrationStats, error: unknown) {
  if (stats.errors.length < MAX_ERRORS_KEPT) {
    stats.errors.push(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Rows are written with one upsert per row inside a single transaction per
 * batch: re-runs converge on the Mongo state (existing ids are overwritten, new
 * ones inserted) and a batch is all-or-nothing. If a batch fails (e.g. a unique
 * violation) it is retried row by row so one bad document does not hide the
 * rest; only the offending rows count as failed.
 */
async function writeBatch<TRow>(
  migrator: CollectionMigrator<any, TRow>,
  prisma: PrismaClient,
  rows: TRow[],
  stats: MigrationStats,
) {
  if (rows.length === 0) return;
  try {
    recordSkips(stats, rows.length, await migrator.upsertBatch(prisma, rows));
    return;
  } catch (batchError) {
    if (rows.length === 1) {
      recordFailure(stats, batchError);
      stats.failed += 1;
      return;
    }
  }
  for (const row of rows) {
    try {
      recordSkips(stats, 1, await migrator.upsertBatch(prisma, [row]));
    } catch (rowError) {
      recordFailure(stats, rowError);
      stats.failed += 1;
    }
  }
}

export async function runMigrators(
  migrators: CollectionMigrator[],
  source: MigrationSource,
  prisma: PrismaClient,
  options: RunOptions = {},
): Promise<MigrationStats[]> {
  const { dryRun = false, batchSize = 500, log = () => undefined } = options;
  const plan = orderMigrators(migrators, options.only);
  const results: MigrationStats[] = [];

  for (const migrator of plan) {
    const stats: MigrationStats = {
      name: migrator.name,
      read: 0,
      written: 0,
      skipped: 0,
      failed: 0,
      sourceCount: await source.count(migrator.collection),
      targetCount: null,
      verified: null,
      errors: [],
    };
    log(`> ${migrator.name}${dryRun ? ' (dry run)' : ''}`);

    for await (const docs of source.read(migrator.collection, batchSize)) {
      const rows: unknown[] = [];
      for (const doc of docs) {
        stats.read += 1;
        try {
          const row = migrator.transform(doc);
          if (row === null) stats.skipped += 1;
          else rows.push(row);
        } catch (error) {
          stats.failed += 1;
          recordFailure(stats, error);
        }
      }
      if (dryRun) stats.written += rows.length;
      else await writeBatch(migrator, prisma, rows, stats);
      log(`  ${stats.read}/${stats.sourceCount}`);
    }

    if (!dryRun) {
      stats.targetCount = await migrator.countTarget(prisma);
      stats.verified =
        stats.failed === 0 &&
        stats.targetCount === stats.sourceCount - stats.skipped;
    }
    results.push(stats);
  }
  return results;
}

export function formatReport(results: MigrationStats[]): string {
  const lines = [
    'collection        read  written  skipped  failed  mongo  postgres  verified',
  ];
  for (const r of results) {
    const verified = r.verified === null ? '-' : r.verified ? 'ok' : 'MISMATCH';
    lines.push(
      [
        r.name.padEnd(14),
        String(r.read).padStart(8),
        String(r.written).padStart(8),
        String(r.skipped).padStart(8),
        String(r.failed).padStart(7),
        String(r.sourceCount).padStart(6),
        String(r.targetCount ?? '-').padStart(9),
        verified.padStart(9),
      ].join(' '),
    );
    for (const [reason, count] of Object.entries(r.skipReasons ?? {})) {
      lines.push(`    - skipped ${count}: ${reason}`);
    }
    for (const error of r.errors) lines.push(`    ! ${error}`);
  }
  return lines.join('\n');
}

export function hasFailures(results: MigrationStats[]): boolean {
  return results.some((r) => r.failed > 0 || r.verified === false);
}
