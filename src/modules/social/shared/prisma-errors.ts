/** Prisma known-request error codes the social repositories translate. */
const code = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null
    ? (error as { code?: string }).code
    : undefined;

/** Unique constraint violation (Mongo's E11000 counterpart). */
export const isUniqueViolation = (error: unknown): boolean =>
  code(error) === 'P2002';

/** Record required by update/delete does not exist. */
export const isRecordNotFound = (error: unknown): boolean =>
  code(error) === 'P2025';
