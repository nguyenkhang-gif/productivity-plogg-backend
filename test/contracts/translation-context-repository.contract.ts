import { newObjectId } from 'src/shared/database/object-id';
import { TranslationContext } from 'src/modules/labs/translation-context/domain/translation-context.entity';
import type { TranslationContextRepository } from 'src/modules/labs/translation-context/domain/translation-context.repository.interface';

export interface TranslationContextRepositoryHarness {
  repo: TranslationContextRepository;
  /** Creates a real user (FK target) and returns its id. */
  createUser(): Promise<string>;
  cleanup(): Promise<void>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Behaviour every TranslationContextRepository implementation must satisfy. */
export function describeTranslationContextRepositoryContract(
  name: string,
  factory: () => Promise<TranslationContextRepositoryHarness>,
): void {
  describe(`TranslationContextRepository contract: ${name}`, () => {
    let h: TranslationContextRepositoryHarness;
    let repo: TranslationContextRepository;
    let alice: string;
    let bob: string;

    const make = (
      userId: string,
      overrides: Partial<TranslationContext> = {},
    ) =>
      new TranslationContext({
        userId,
        title: 'Title',
        genre: 'fantasy',
        setting: 'a world',
        targetTone: 'formal',
        sourceLanguage: 'ja',
        targetLanguage: 'vi',
        characters: [
          {
            name: 'Aya',
            role: 'hero',
            personality: 'brave',
            speechStyle: 'casual',
            honorific: 'chan',
          },
        ],
        glossary: [{ original: 'ki', translation: 'khí', note: 'n' }],
        styleGuide: {
          formality: 'high',
          keepHonorifics: false,
          keepOriginalNames: true,
          chapterLabel: 'Chương',
        },
        chapterSummaries: [{ chapterNumber: '1', summary: 'Start' }],
        ...overrides,
      });

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });

    beforeEach(async () => {
      alice = await h.createUser();
      bob = await h.createUser();
    });

    afterAll(async () => {
      await h.cleanup();
    });

    describe('create / findById', () => {
      it('persists with a 24-hex id and round-trips nested documents', async () => {
        const created = await repo.create(make(alice));
        expect(created.id).toMatch(/^[0-9a-f]{24}$/);
        expect(created).toMatchObject({
          userId: alice,
          title: 'Title',
          sourceLanguage: 'ja',
          targetLanguage: 'vi',
        });
        expect(created.characters).toEqual(make(alice).characters);
        expect(created.glossary).toEqual(make(alice).glossary);
        expect(created.styleGuide).toEqual(make(alice).styleGuide);
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(await repo.findById(created.id)).toEqual(created);
      });

      it('defaults list fields to empty arrays', async () => {
        const created = await repo.create(
          make(alice, {
            characters: undefined,
            glossary: undefined,
            chapterSummaries: undefined,
          }),
        );
        expect(created.characters).toEqual([]);
        expect(created.glossary).toEqual([]);
        expect(created.chapterSummaries).toEqual([]);
      });

      it('findById exposes the owner and returns null for unknown ids', async () => {
        const created = await repo.create(make(alice));
        expect((await repo.findById(created.id))?.userId).toBe(alice);
        expect(await repo.findById(newObjectId())).toBeNull();
      });
    });

    describe('findByUserId', () => {
      it('returns only own contexts, newest first', async () => {
        const first = await repo.create(make(alice, { title: 'first' }));
        await wait(5);
        const second = await repo.create(make(alice, { title: 'second' }));
        await repo.create(make(bob));

        const list = await repo.findByUserId(alice);
        expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
        expect(list.every((c) => c.userId === alice)).toBe(true);
        expect(await repo.findByUserId(newObjectId())).toEqual([]);
      });
    });

    describe('update', () => {
      it('applies only provided fields and keeps the owner', async () => {
        const created = await repo.create(make(alice));
        const updated = await repo.update(created.id, {
          title: 'New',
          chapterSummaries: [],
          // an attacker-supplied owner must never be applied
          userId: bob,
        } as Partial<TranslationContext>);
        expect(updated.title).toBe('New');
        expect(updated.chapterSummaries).toEqual([]);
        expect(updated.genre).toBe('fantasy');
        expect(updated.characters).toEqual(created.characters);
        expect(updated.userId).toBe(alice);
        expect((await repo.findById(created.id))?.userId).toBe(alice);
      });

      it('throws NotFound for an unknown id', async () => {
        await expect(
          repo.update(newObjectId(), { title: 'x' }),
        ).rejects.toMatchObject({ status: 404 });
      });
    });

    describe('delete', () => {
      it('removes only the targeted record', async () => {
        const mine = await repo.create(make(alice));
        const theirs = await repo.create(make(bob));
        await repo.delete(mine.id);
        expect(await repo.findById(mine.id)).toBeNull();
        expect(await repo.findById(theirs.id)).not.toBeNull();
        expect(await repo.findByUserId(bob)).toHaveLength(1);
      });

      it('throws NotFound for an unknown id', async () => {
        await expect(repo.delete(newObjectId())).rejects.toMatchObject({
          status: 404,
        });
      });
    });
  });
}
