import { newObjectId } from 'src/shared/database/object-id';
import { User } from 'src/modules/identity/user/domain/user.entity';
import type { UserRepository } from 'src/modules/identity/user/domain/user.repository.interface';

export interface UserRepositoryHarness {
  repo: UserRepository;
  /** Must delete every user whose username starts with `contract_`. */
  cleanup(): Promise<void>;
  /** Cross-module data the repository reads (friendships, posts). */
  seed: {
    friendship(userId: string, friendId: string): Promise<void>;
    posts(authorId: string, count: number): Promise<void>;
  };
}

/**
 * Behaviour every UserRepository implementation (Mongo, Prisma, ...) must
 * satisfy. Rows are isolated by a per-run tag so the suite tolerates a shared
 * database; call it from a spec that owns the backing store.
 */
export function describeUserRepositoryContract(
  name: string,
  factory: () => Promise<UserRepositoryHarness>,
): void {
  describe(`UserRepository contract: ${name}`, () => {
    let h: UserRepositoryHarness;
    let repo: UserRepository;
    let tag: string;
    let counter = 0;

    const make = (overrides: Partial<User> = {}) => {
      counter += 1;
      const n = `${tag}_${counter}`;
      return new User({
        fullName: `Contract User ${n}`,
        username: `contract_${n}`,
        email: `contract_${n}@example.com`,
        passwordHash: '$2b$12$hash',
        gender: 'female',
        profilePic: 'https://img.example/p.png',
        ...overrides,
      });
    };

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });

    beforeEach(() => {
      tag = newObjectId().slice(-8);
    });

    afterAll(async () => {
      await h.cleanup();
    });

    describe('create', () => {
      it('persists a user with defaults and a 24-hex id', async () => {
        const created = await repo.create(
          make({ profilePic: undefined, gender: undefined as any }),
        );
        expect(created.id).toMatch(/^[0-9a-f]{24}$/);
        expect(created.gender).toBe('other');
        expect(created.membership).toBe('basic');
        expect(created.role).toBe('user');
        expect(created.isPrivate).toBe(false);
        expect(created.profilePic).toBeUndefined();
        expect(created.googleId).toBeUndefined();
        expect(created.resetPasswordToken).toBeUndefined();
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
      });

      it('stores provided fields and oauth ids', async () => {
        const created = await repo.create(
          make({ googleId: `g-${tag}`, facebookId: `f-${tag}` }),
        );
        expect(created).toMatchObject({
          gender: 'female',
          profilePic: 'https://img.example/p.png',
          googleId: `g-${tag}`,
          facebookId: `f-${tag}`,
          passwordHash: '$2b$12$hash',
        });
      });

      it('rejects duplicate email and username', async () => {
        const first = await repo.create(make());
        await expect(
          repo.create(make({ email: first.email })),
        ).rejects.toBeDefined();
        await expect(
          repo.create(make({ username: first.username })),
        ).rejects.toBeDefined();
      });
    });

    describe('lookups', () => {
      it('findById returns the same entity, null for unknown ids', async () => {
        const created = await repo.create(make());
        expect(await repo.findById(created.id)).toEqual(created);
        expect(await repo.findById(newObjectId())).toBeNull();
      });

      it('findByEmail / findByUsername match exactly (case-sensitive)', async () => {
        const created = await repo.create(make());
        expect((await repo.findByEmail(created.email))?.id).toBe(created.id);
        expect((await repo.findByUsername(created.username))?.id).toBe(
          created.id,
        );
        expect(await repo.findByEmail(created.email.toUpperCase())).toBeNull();
        expect(
          await repo.findByUsername(created.username.toUpperCase()),
        ).toBeNull();
        expect(await repo.findByEmail('nobody@example.com')).toBeNull();
      });

      it('findByGoogleId / findByFacebookId', async () => {
        const created = await repo.create(
          make({ googleId: `g-${tag}`, facebookId: `f-${tag}` }),
        );
        expect((await repo.findByGoogleId(`g-${tag}`))?.id).toBe(created.id);
        expect((await repo.findByFacebookId(`f-${tag}`))?.id).toBe(created.id);
        expect(await repo.findByGoogleId('missing')).toBeNull();
        expect(await repo.findByFacebookId('missing')).toBeNull();
      });
    });

    describe('update', () => {
      it('applies only the provided fields and returns the new state', async () => {
        const created = await repo.create(make());
        const updated = await repo.update(created.id, {
          fullName: 'Renamed',
          isPrivate: true,
          role: 'moderator' as User['role'],
          membership: 'premium',
          resetPasswordToken: 'reset-token',
          googleId: `g-${tag}`,
        });
        expect(updated).toMatchObject({
          id: created.id,
          fullName: 'Renamed',
          isPrivate: true,
          role: 'moderator',
          membership: 'premium',
          resetPasswordToken: 'reset-token',
          googleId: `g-${tag}`,
          username: created.username,
          email: created.email,
          passwordHash: created.passwordHash,
        });
        expect(updated.updatedAt!.getTime()).toBeGreaterThanOrEqual(
          created.updatedAt!.getTime(),
        );
        expect(await repo.findById(created.id)).toEqual(updated);
      });

      it('ignores undefined fields', async () => {
        const created = await repo.create(make());
        const updated = await repo.update(created.id, {
          fullName: undefined,
          profilePic: 'new.png',
        });
        expect(updated.fullName).toBe(created.fullName);
        expect(updated.profilePic).toBe('new.png');
      });

      it('throws "User not found" for unknown ids', async () => {
        await expect(
          repo.update(newObjectId(), { fullName: 'x' }),
        ).rejects.toThrow('User not found');
      });
    });

    describe('search', () => {
      it('matches username or fullName case-insensitively, as a literal', async () => {
        const me = await repo.create(make());
        const alice = await repo.create(
          make({
            fullName: `Alice Wonder ${tag}`,
            username: `contract_al_${tag}`,
          }),
        );
        const bob = await repo.create(
          make({
            fullName: `Bob (the) builder.* ${tag}`,
            username: `contract_bo_${tag}`,
          }),
        );

        const byName = await repo.search(`ALICE wonder ${tag}`, me.id);
        expect(byName.map((u) => u.id)).toEqual([alice.id]);

        const byUsername = await repo.search(`CONTRACT_BO_${tag}`, me.id);
        expect(byUsername.map((u) => u.id)).toEqual([bob.id]);

        const literal = await repo.search(`(the) builder.* ${tag}`, me.id);
        expect(literal.map((u) => u.id)).toEqual([bob.id]);

        expect(await repo.search(`.*${tag}`, me.id)).toEqual([]);
        expect(await repo.search(`%${tag}`, me.id)).toEqual([]);
        expect(await repo.search(`c_ntract_${tag}`, me.id)).toEqual([]);
      });

      it('excludes the caller and excludeIds, returns card fields only', async () => {
        const me = await repo.create(make({ fullName: `Zed ${tag}` }));
        const other = await repo.create(make({ fullName: `Zed ${tag} two` }));
        const hidden = await repo.create(
          make({ fullName: `Zed ${tag} three` }),
        );

        const result = await repo.search(`zed ${tag}`, me.id, [hidden.id]);
        expect(result.map((u) => u.id)).toEqual([other.id]);
        expect(result[0]).toMatchObject({
          fullName: other.fullName,
          username: other.username,
          profilePic: other.profilePic,
        });
        expect(result[0].email).toBeUndefined();
        expect(result[0].passwordHash).toBeUndefined();
      });

      it('returns at most 20 results', async () => {
        const me = await repo.create(make());
        for (let i = 0; i < 22; i++) {
          await repo.create(make({ fullName: `Many ${tag} ${i}` }));
        }
        expect(await repo.search(`many ${tag}`, me.id)).toHaveLength(20);
      });
    });

    describe('findSuggestions', () => {
      it('excludes self, friends (either direction) and private users', async () => {
        const me = await repo.create(make());
        const friendA = await repo.create(make());
        const friendB = await repo.create(make());
        const priv = await repo.create(make());
        await repo.update(priv.id, { isPrivate: true });
        const stranger = await repo.create(make());
        await h.seed.friendship(me.id, friendA.id);
        await h.seed.friendship(friendB.id, me.id);

        const ids = (await repo.findSuggestions(me.id, 1000)).map((u) => u.id);
        expect(ids).toContain(stranger.id);
        for (const excluded of [me.id, friendA.id, friendB.id, priv.id]) {
          expect(ids).not.toContain(excluded);
        }
      });

      it('respects the limit and returns card fields only', async () => {
        const me = await repo.create(make());
        await repo.create(make());
        await repo.create(make());
        const result = await repo.findSuggestions(me.id, 1);
        expect(result).toHaveLength(1);
        expect(result[0].email).toBeUndefined();
        expect(result[0].username).toBeDefined();
      });
    });

    describe('findAll', () => {
      it('filters, hides secrets, attaches post counts and paginates newest first', async () => {
        const users = [];
        for (let i = 0; i < 3; i++) {
          users.push(
            await repo.create(
              make({
                fullName: `Admin List ${tag} ${i}`,
                googleId: `g-${tag}-${i}`,
              }),
            ),
          );
          await new Promise((r) => setTimeout(r, 5));
        }
        await repo.update(users[0].id, {
          role: 'admin' as User['role'],
          resetPasswordToken: 'secret',
        });
        await repo.update(users[1].id, { membership: 'premium' });
        await h.seed.posts(users[2].id, 3);

        const all = await repo.findAll({
          search: `list ${tag}`,
          page: 1,
          limit: 10,
        });
        expect(all.total).toBe(3);
        expect(all.page).toBe(1);
        expect(all.limit).toBe(10);
        expect(all.data.map((u) => u.id)).toEqual([
          users[2].id,
          users[1].id,
          users[0].id,
        ]);
        for (const u of all.data as User[]) {
          expect(u.passwordHash).toBeUndefined();
          expect(u.resetPasswordToken).toBeUndefined();
          expect(u.googleId).toBeUndefined();
          expect(u.facebookId).toBeUndefined();
          expect(u.email).toBeDefined();
        }
        expect(all.data.map((u) => u.postCount)).toEqual([3, 0, 0]);

        const byEmail = await repo.findAll({
          search: users[1].email.toUpperCase(),
          page: 1,
          limit: 10,
        });
        expect(byEmail.data.map((u) => u.id)).toEqual([users[1].id]);

        const admins = await repo.findAll({
          search: `list ${tag}`,
          role: 'admin',
          page: 1,
          limit: 10,
        });
        expect(admins.data.map((u) => u.id)).toEqual([users[0].id]);

        const premium = await repo.findAll({
          search: `list ${tag}`,
          membership: 'premium',
          page: 1,
          limit: 10,
        });
        expect(premium.data.map((u) => u.id)).toEqual([users[1].id]);

        const page2 = await repo.findAll({
          search: `list ${tag}`,
          page: 2,
          limit: 2,
        });
        expect(page2.total).toBe(3);
        expect(page2.data.map((u) => u.id)).toEqual([users[0].id]);
      });

      it('treats regex metacharacters in search literally', async () => {
        await repo.create(make({ fullName: `Meta ${tag}` }));
        const result = await repo.findAll({
          search: `.*${tag}`,
          page: 1,
          limit: 10,
        });
        expect(result.total).toBe(0);
      });
    });
  });
}
