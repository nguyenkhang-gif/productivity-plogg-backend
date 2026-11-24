import { newObjectId } from 'src/shared/database/object-id';
import type { TagRepository } from 'src/modules/social/tag/domain/tag.repository.interface';
import type { CategoryRepository } from 'src/modules/social/category/domain/category.repository.interface';

export interface TagRepositoryHarness {
  repo: TagRepository;
  /** Must delete every tag whose slug starts with `tc-`. */
  cleanup(): Promise<void>;
}

export interface CategoryRepositoryHarness {
  repo: CategoryRepository;
  /** Must delete every category whose slug starts with `tc-`. */
  cleanup(): Promise<void>;
}

export function describeTagRepositoryContract(
  name: string,
  factory: () => Promise<TagRepositoryHarness>,
): void {
  describe(`TagRepository contract: ${name}`, () => {
    let h: TagRepositoryHarness;
    let repo: TagRepository;
    let run: string;
    let n = 0;

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });
    beforeEach(() => {
      run = newObjectId().slice(-8);
    });
    afterAll(async () => {
      await h.cleanup();
    });

    const slug = (suffix: string) => `tc-${run}-${suffix}-${++n}`;

    it('findOrCreate creates once and keeps the first name for a slug', async () => {
      const s = slug('a');
      const first = await repo.findOrCreate('First Name', s);
      expect(first.id).toMatch(/^[0-9a-f]{24}$/);
      expect(first).toMatchObject({
        name: 'First Name',
        slug: s,
        postCount: 0,
      });
      expect(first.createdAt).toBeInstanceOf(Date);

      const again = await repo.findOrCreate('Other Name', s);
      expect(again.id).toBe(first.id);
      expect(again.name).toBe('First Name');
    });

    it('findOrCreate is safe under concurrency', async () => {
      const s = slug('race');
      const results = await Promise.all(
        Array.from({ length: 5 }, () => repo.findOrCreate('Race', s)),
      );
      expect(new Set(results.map((r) => r.id)).size).toBe(1);
    });

    it('findByIds returns the matching tags only', async () => {
      const a = await repo.findOrCreate('A', slug('a'));
      const b = await repo.findOrCreate('B', slug('b'));
      await repo.findOrCreate('C', slug('c'));
      const found = await repo.findByIds([a.id, b.id, newObjectId()]);
      expect(found.map((t) => t.id).sort()).toEqual([a.id, b.id].sort());
      expect(await repo.findByIds([])).toEqual([]);
    });

    it('incrementPostCount / decrementPostCount never go below zero', async () => {
      const a = await repo.findOrCreate('A', slug('a'));
      const b = await repo.findOrCreate('B', slug('b'));
      await repo.incrementPostCount([a.id, b.id]);
      await repo.incrementPostCount([a.id]);
      let [ra, rb] = await repo
        .findByIds([a.id, b.id])
        .then((t) => [
          t.find((x) => x.id === a.id)!,
          t.find((x) => x.id === b.id)!,
        ]);
      expect([ra.postCount, rb.postCount]).toEqual([2, 1]);

      await repo.decrementPostCount([a.id, b.id]);
      await repo.decrementPostCount([b.id]); // already 0: stays 0
      await repo.decrementPostCount([b.id]);
      [ra, rb] = await repo
        .findByIds([a.id, b.id])
        .then((t) => [
          t.find((x) => x.id === a.id)!,
          t.find((x) => x.id === b.id)!,
        ]);
      expect([ra.postCount, rb.postCount]).toEqual([1, 0]);

      await expect(repo.incrementPostCount([])).resolves.toBeUndefined();
      await expect(repo.decrementPostCount([])).resolves.toBeUndefined();
    });

    it('findBySlugSearch matches case-insensitively as a literal, best-counted first', async () => {
      const low = await repo.findOrCreate('Low', slug('needle'));
      const high = await repo.findOrCreate('High', slug('Needle-x'));
      await repo.findOrCreate('Other', slug('hay'));
      await repo.incrementPostCount([high.id]);
      await repo.incrementPostCount([high.id]);
      await repo.incrementPostCount([low.id]);

      const res = await repo.findBySlugSearch(`NEEDLE`, 50);
      const mine = res.filter((t) => t.slug.startsWith(`tc-${run}-`));
      expect(mine.map((t) => t.id)).toEqual([high.id, low.id]);

      expect(
        (await repo.findBySlugSearch(`${run}-needle`, 1)).length,
      ).toBeLessThanOrEqual(1);

      // wildcards and regex metacharacters are literals
      expect(await repo.findBySlugSearch('%', 50)).toEqual([]);
      expect(await repo.findBySlugSearch('_', 50)).toEqual([]);
      expect(await repo.findBySlugSearch('.*', 50)).toEqual([]);
    });

    it('findTrending lists tags with posts, highest count first, limited', async () => {
      const a = await repo.findOrCreate('A', slug('a'));
      const b = await repo.findOrCreate('B', slug('b'));
      const zero = await repo.findOrCreate('Z', slug('z'));
      await repo.incrementPostCount([a.id]);
      await repo.incrementPostCount([b.id]);
      await repo.incrementPostCount([b.id]);
      await repo.incrementPostCount([b.id]);

      const res = await repo.findTrending(1000);
      const mine = res.filter((t) => t.slug.startsWith(`tc-${run}-`));
      expect(mine.map((t) => t.id)).toEqual([b.id, a.id]);
      expect(res.find((t) => t.id === zero.id)).toBeUndefined();
      expect(res.every((t) => t.postCount > 0)).toBe(true);
      expect((await repo.findTrending(1)).length).toBeLessThanOrEqual(1);
    });
  });
}

export function describeCategoryRepositoryContract(
  name: string,
  factory: () => Promise<CategoryRepositoryHarness>,
): void {
  describe(`CategoryRepository contract: ${name}`, () => {
    let h: CategoryRepositoryHarness;
    let repo: CategoryRepository;
    let run: string;
    let n = 0;

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });
    beforeEach(() => {
      run = newObjectId().slice(-8);
    });
    afterAll(async () => {
      await h.cleanup();
    });

    const slug = (suffix: string) => `tc-${run}-${suffix}-${++n}`;

    it('create starts at postCount 0 and rejects a duplicate slug with a conflict', async () => {
      const s = slug('a');
      const created = await repo.create({ name: 'Alpha', slug: s });
      expect(created.id).toMatch(/^[0-9a-f]{24}$/);
      expect(created).toMatchObject({ name: 'Alpha', slug: s, postCount: 0 });
      expect(created.createdAt).toBeInstanceOf(Date);

      await expect(repo.create({ name: 'Dup', slug: s })).rejects.toThrow(
        'Category slug already exists',
      );
    });

    it('findById / findBySlug / findAll', async () => {
      const a = await repo.create({ name: `B-${run}`, slug: slug('b') });
      const b = await repo.create({ name: `A-${run}`, slug: slug('a') });
      expect((await repo.findById(a.id))?.slug).toBe(a.slug);
      expect((await repo.findBySlug(b.slug))?.id).toBe(b.id);
      expect(await repo.findById(newObjectId())).toBeNull();
      expect(await repo.findBySlug('tc-missing')).toBeNull();

      const all = await repo.findAll();
      const mine = all.filter((c) => c.slug.startsWith(`tc-${run}-`));
      // sorted by name ascending
      expect(mine.map((c) => c.id)).toEqual([b.id, a.id]);
    });

    it('update changes name/slug, 404s on unknown ids, conflicts on a taken slug', async () => {
      const a = await repo.create({ name: 'Old', slug: slug('old') });
      const taken = await repo.create({ name: 'Taken', slug: slug('taken') });
      const newSlug = slug('new');

      const updated = await repo.update(a.id, { name: 'New', slug: newSlug });
      expect(updated).toMatchObject({ id: a.id, name: 'New', slug: newSlug });

      const nameOnly = await repo.update(a.id, { name: 'Renamed' });
      expect(nameOnly).toMatchObject({ name: 'Renamed', slug: newSlug });

      await expect(repo.update(newObjectId(), { name: 'x' })).rejects.toThrow(
        'Category not found',
      );
      await expect(repo.update(a.id, { slug: taken.slug })).rejects.toThrow(
        'Category slug already exists',
      );
    });

    it('delete removes the category; unknown ids 404', async () => {
      const a = await repo.create({ name: 'Gone', slug: slug('gone') });
      await repo.delete(a.id);
      expect(await repo.findById(a.id)).toBeNull();
      await expect(repo.delete(a.id)).rejects.toThrow('Category not found');
    });

    it('incrementPostCount / decrementPostCount (floor at zero, unknown ids ignored)', async () => {
      const a = await repo.create({ name: 'Count', slug: slug('count') });
      await repo.incrementPostCount(a.id);
      await repo.incrementPostCount(a.id);
      expect((await repo.findById(a.id))!.postCount).toBe(2);
      await repo.decrementPostCount(a.id);
      expect((await repo.findById(a.id))!.postCount).toBe(1);
      await repo.decrementPostCount(a.id);
      await repo.decrementPostCount(a.id);
      expect((await repo.findById(a.id))!.postCount).toBe(0);

      await expect(
        repo.incrementPostCount(newObjectId()),
      ).resolves.toBeUndefined();
      await expect(
        repo.decrementPostCount(newObjectId()),
      ).resolves.toBeUndefined();
    });
  });
}
