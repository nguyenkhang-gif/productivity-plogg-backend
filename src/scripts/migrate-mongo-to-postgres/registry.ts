import type { CollectionMigrator } from './migrator';
import { usersMigrator } from './migrators/users.migrator';
import { epubMigrator } from './migrators/epub.migrator';
import { storyContextMigrator } from './migrators/story-context.migrator';
import { translationContextMigrator } from './migrators/translation-context.migrator';
import { mailLogMigrator } from './migrators/mail-log.migrator';
import {
  categoriesMigrator,
  tagsMigrator,
} from './migrators/taxonomy.migrators';
import { friendshipsMigrator } from './migrators/friendships.migrator';
import { postsMigrator, postTagsMigrator } from './migrators/posts.migrator';
import {
  bookmarksMigrator,
  commentsMigrator,
  reactionsMigrator,
} from './migrators/engagement.migrators';
import {
  focusDailyMigrator,
  focusMonthlyMigrator,
  focusRawMigrator,
  focusWeeklyMigrator,
} from './migrators/focus.migrator';
import { userProgressMigrator } from './migrators/user-progress.migrator';
import { vaultMigrator } from './migrators/vault.migrator';

/** Register new migrators here; order is resolved from `dependsOn`. */
export const MIGRATORS: CollectionMigrator[] = [
  usersMigrator,
  epubMigrator,
  storyContextMigrator,
  translationContextMigrator,
  mailLogMigrator,
  categoriesMigrator,
  tagsMigrator,
  friendshipsMigrator,
  postsMigrator,
  postTagsMigrator,
  commentsMigrator,
  reactionsMigrator,
  bookmarksMigrator,
  focusRawMigrator,
  focusDailyMigrator,
  focusWeeklyMigrator,
  focusMonthlyMigrator,
  userProgressMigrator,
  vaultMigrator,
];
