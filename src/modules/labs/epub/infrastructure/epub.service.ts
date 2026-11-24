import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Epub } from 'src/modules/labs/epub/domain/epub.entity';
import { epubI } from 'src/modules/labs/epub/domain/epub.interfaces';
import {
  EPUB_REPOSITORY,
  EpubRepository,
} from 'src/modules/labs/epub/domain/epub.repository.interface';
import { isObjectId } from 'src/shared/database/object-id';

@Injectable()
export class EpubService {
  constructor(
    @Inject(EPUB_REPOSITORY) private readonly epubRepository: EpubRepository,
  ) {}

  private assertValidId(id: string) {
    if (!isObjectId(id)) throw new BadRequestException('Invalid ID');
  }

  async create(item: epubI): Promise<Epub> {
    return this.epubRepository.create(new Epub(item));
  }

  async findAll(userId: string): Promise<Epub[]> {
    return this.epubRepository.findAllByUser(userId);
  }

  async findOne(id: string, userId: string): Promise<Epub> {
    this.assertValidId(id);
    const epub = await this.epubRepository.findByIdForUser(id, userId);
    if (!epub) throw new NotFoundException('Epub not found');
    return epub;
  }

  async update(
    id: string,
    updateData: Partial<Pick<Epub, 'sampleUrl' | 'properties'>>,
    userId: string,
  ): Promise<Epub> {
    this.assertValidId(id);
    const epub = await this.epubRepository.updateForUser(
      id,
      userId,
      updateData,
    );
    if (!epub) throw new NotFoundException('Epub not found or no permission');
    return epub;
  }

  async delete(id: string, userId: string): Promise<void> {
    this.assertValidId(id);
    const deleted = await this.epubRepository.deleteForUser(id, userId);
    if (!deleted) throw new NotFoundException('Epub not found or no permission');
  }
}
