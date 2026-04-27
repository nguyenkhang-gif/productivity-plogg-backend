import { Epub } from '../entities/epub.entity';
export const EPUB_REPOSITORY = 'EPUB_REPOSITORY';

export interface EpubRepository {
  findById(id: string): Promise<Epub | null>;
  create(epub: Epub): Promise<Epub>;
  update(id: string, epub: Partial<Epub>): Promise<Epub>;
}
