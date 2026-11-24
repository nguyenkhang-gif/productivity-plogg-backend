import type { CollectionMigrator } from './migrator';
import { usersMigrator } from './migrators/users.migrator';

/** Register new migrators here; order is resolved from `dependsOn`. */
export const MIGRATORS: CollectionMigrator[] = [usersMigrator];
