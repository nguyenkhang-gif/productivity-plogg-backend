import { newObjectId } from 'src/shared/database/object-id';
import { Epub } from 'src/modules/labs/epub/domain/epub.entity';
import type { EpubRepository } from 'src/modules/labs/epub/domain/epub.repository.interface';

export interface EpubRepositoryHarness {
  repo: EpubRepository;
  /** Creates a real user (FK target) and returns its id. */
  createUser(): Promise<string>;
  cleanup(): Promise<void>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Behaviour every EpubRepository implementation must satisfy. */
export function describeEpubRepositoryContract(
  name: string,
  factory: () => Promise<EpubRepositoryHarness>,
): void {
  describe(`EpubRepository contract: ${name}`, () => {
    let h: EpubRepositoryHarness;
    let repo: EpubRepository;
    let alice: string;
    let bob: string;

    const make = (userId: string, overrides: Partial<Epub> = {}) =>
      new Epub({
        createdUserId: userId,
        sampleUrl: 'https://example.com/a.epub',
        properties: { title: 'T', nested: { list: [1, 'two', null] } },
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
      it('persists with a 24-hex id and round-trips json properties', async () => {
        const created = await repo.create(make(alice));
        expect(created.id).toMatch(/^[0-9a-f]{24}$/);
        expect(created.createdUserId).toBe(alice);
        expect(created.properties).toEqual({
          title: 'T',
          nested: { list: [1, 'two', null] },
        });
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
        expect(await repo.findById(created.id)).toEqual(created);
      });

      it('sampleUrl is optional', async () => {
        const created = await repo.create(make(alice, { sampleUrl: undefined }));
        expect(created.sampleUrl).toBeUndefined();
      });

      it('findById returns null for unknown ids', async () => {
        expect(await repo.findById(newObjectId())).toBeNull();
      });
    });

    describe('update', () => {
      it('applies only provided fields and returns the new state', async () => {
        const created = await repo.create(make(alice));
        const updated = await repo.update(created.id, {
          properties: { replaced: true },
        });
        expect(updated.properties).toEqual({ replaced: true });
        expect(updated.sampleUrl).toBe('https://example.com/a.epub');
        expect(updated.createdUserId).toBe(alice);
      });

      it('throws for an unknown id', async () => {
        await expect(
          repo.update(newObjectId(), { sampleUrl: 'x' }),
        ).rejects.toBeDefined();
      });
    });

    describe('owner scoping', () => {
      it('findAllByUser returns only own epubs, newest first', async () => {
        const first = await repo.create(make(alice));
        await wait(5);
        const second = await repo.create(make(alice));
        await repo.create(make(bob));

        const list = await repo.findAllByUser(alice);
        expect(list.map((e) => e.id)).toEqual([second.id, first.id]);
        expect(list.every((e) => e.createdUserId === alice)).toBe(true);
        expect(await repo.findAllByUser(newObjectId())).toEqual([]);
      });

      it('findByIdForUser never returns another user\'s epub', async () => {
        const created = await repo.create(make(alice));
        expect((await repo.findByIdForUser(created.id, alice))?.id).toBe(
          created.id,
        );
        expect(await repo.findByIdForUser(created.id, bob)).toBeNull();
        expect(await repo.findByIdForUser(newObjectId(), alice)).toBeNull();
      });

      it('updateForUser updates own epub and leaves another user\'s untouched', async () => {
        const created = await repo.create(make(alice));

        expect(
          await repo.updateForUser(created.id, bob, {
            properties: { hacked: true },
            sampleUrl: 'https://evil.example',
          }),
        ).toBeNull();
        const untouched = await repo.findById(created.id);
        expect(untouched?.properties).toEqual(created.properties);
        expect(untouched?.sampleUrl).toBe(created.sampleUrl);

        const updated = await repo.updateForUser(created.id, alice, {
          sampleUrl: 'https://example.com/b.epub',
        });
        expect(updated?.sampleUrl).toBe('https://example.com/b.epub');
        expect(updated?.properties).toEqual(created.properties);
        expect(updated?.createdUserId).toBe(alice);
      });

      it('updateForUser returns null for an unknown id', async () => {
        expect(
          await repo.updateForUser(newObjectId(), alice, { sampleUrl: 'x' }),
        ).toBeNull();
      });

      it('deleteForUser refuses another user\'s epub and deletes own', async () => {
        const created = await repo.create(make(alice));
        expect(await repo.deleteForUser(created.id, bob)).toBe(false);
        expect(await repo.findById(created.id)).not.toBeNull();

        expect(await repo.deleteForUser(created.id, alice)).toBe(true);
        expect(await repo.findById(created.id)).toBeNull();
        expect(await repo.deleteForUser(created.id, alice)).toBe(false);
      });
    });
  });
}
