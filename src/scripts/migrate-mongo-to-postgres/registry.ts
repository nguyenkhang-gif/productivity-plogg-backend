import type { CollectionMigrator } from './migrator';
import { usersMigrator } from './migrators/users.migrator';
import { epubMigrator } from './migrators/epub.migrator';
import { storyContextMigrator } from './migrators/story-context.migrator';
import { translationContextMigrator } from './migrators/translation-context.migrator';
import { mailLogMigrator } from './migrators/mail-log.migrator';

/** Register new migrators here; order is resolved from `dependsOn`. */
export const MIGRATORS: CollectionMigrator[] = [
  usersMigrator,
  epubMigrator,
  storyContextMigrator,
  translationContextMigrator,
  mailLogMigrator,
];
