import { Epub } from './epub.entity';
export const EPUB_REPOSITORY = 'EPUB_REPOSITORY';

export interface EpubRepository {
  findById(id: string): Promise<Epub | null>;
  create(epub: Epub): Promise<Epub>;
  update(id: string, epub: Partial<Epub>): Promise<Epub>;

  /** Owner-scoped operations: never touch or return another user's epub. */
  findAllByUser(userId: string): Promise<Epub[]>;
  findByIdForUser(id: string, userId: string): Promise<Epub | null>;
  /** Returns null when the epub does not exist or belongs to someone else. */
  updateForUser(
    id: string,
    userId: string,
    data: Partial<Pick<Epub, 'sampleUrl' | 'properties'>>,
  ): Promise<Epub | null>;
  /** Returns false when the epub does not exist or belongs to someone else. */
  deleteForUser(id: string, userId: string): Promise<boolean>;
}
