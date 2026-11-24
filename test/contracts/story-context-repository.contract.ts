import { newObjectId } from 'src/shared/database/object-id';
import { StoryContext } from 'src/modules/labs/story-context/domain/story-context.entity';
import type { StoryContextRepository } from 'src/modules/labs/story-context/domain/story-context.repository.interface';

export interface StoryContextRepositoryHarness {
  repo: StoryContextRepository;
  /** Creates a real user (FK target) and returns its id. */
  createUser(): Promise<string>;
  cleanup(): Promise<void>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Behaviour every StoryContextRepository implementation must satisfy. */
export function describeStoryContextRepositoryContract(
  name: string,
  factory: () => Promise<StoryContextRepositoryHarness>,
): void {
  describe(`StoryContextRepository contract: ${name}`, () => {
    let h: StoryContextRepositoryHarness;
    let repo: StoryContextRepository;
    let alice: string;
    let bob: string;

    const make = (userId: string, overrides: Partial<StoryContext> = {}) =>
      new StoryContext({
        userId,
        title: 'Title',
        author: 'Author',
        genre: 'fantasy',
        setting: 'a world',
        targetTone: 'formal',
        sourceLanguage: 'ja',
        targetLanguage: 'vi',
        characters: [
          {
            name: 'Aya',
            vietnameseName: 'A Gia',
            role: 'hero',
            personality: 'brave',
            speechStyle: 'casual',
            honorific: 'chan',
            note: 'n',
          },
        ],
        glossary: [{ original: 'ki', translation: 'khí' }],
        styleGuide: {
          formality: 'high',
          keepHonorifics: true,
          keepOriginalNames: false,
          chapterLabel: 'Chương',
          extraNotes: 'notes',
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
          author: 'Author',
          sourceLanguage: 'ja',
          targetLanguage: 'vi',
        });
        expect(created.characters).toEqual(make(alice).characters);
        expect(created.glossary).toEqual([
          { original: 'ki', translation: 'khí' },
        ]);
        expect(created.styleGuide.keepHonorifics).toBe(true);
        expect(created.chapterSummaries).toEqual([
          { chapterNumber: '1', summary: 'Start' },
        ]);
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
      it('returns only own contexts, newest first, with pagination metadata', async () => {
        const ids: string[] = [];
        for (let i = 0; i < 3; i++) {
          ids.push((await repo.create(make(alice, { title: `t${i}` }))).id);
          await wait(5);
        }
        await repo.create(make(bob));

        const page1 = await repo.findByUserId(alice, 1, 2);
        expect(page1.data.map((c) => c.id)).toEqual([ids[2], ids[1]]);
        expect(page1.pagination).toEqual({
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
        });

        const page2 = await repo.findByUserId(alice, 2, 2);
        expect(page2.data.map((c) => c.id)).toEqual([ids[0]]);

        const none = await repo.findByUserId(alice, 3, 2);
        expect(none.data).toEqual([]);
        expect(none.pagination.total).toBe(3);
      });

      it('returns an empty page for a user with nothing', async () => {
        const res = await repo.findByUserId(bob, 1, 10);
        expect(res).toEqual({
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        });
      });
    });

    describe('update', () => {
      it('applies only provided fields and keeps the owner', async () => {
        const created = await repo.create(make(alice));
        const updated = await repo.update(created.id, {
          title: 'New',
          glossary: [],
          // an attacker-supplied owner must never be applied
          userId: bob,
        } as Partial<StoryContext>);
        expect(updated.title).toBe('New');
        expect(updated.glossary).toEqual([]);
        expect(updated.author).toBe('Author');
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
        expect((await repo.findByUserId(bob, 1, 10)).pagination.total).toBe(1);
      });

      it('throws NotFound for an unknown id', async () => {
        await expect(repo.delete(newObjectId())).rejects.toMatchObject({
          status: 404,
        });
      });
    });
  });
}
