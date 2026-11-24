import {
  NO_RELATIONSHIP,
  Relationship,
  SELF_RELATIONSHIP,
} from '../../friendship/domain/relationship';
import {
  canDeletePost,
  canEditPost,
  canReact,
  canShare,
  canViewAuthorPage,
  canViewPost,
  decidePostView,
} from './post.policy';

const rel = (partial: Partial<Relationship>): Relationship => ({
  ...NO_RELATIONSHIP,
  ...partial,
});

const stranger = rel({});
const friend = rel({ isFriend: true });
const blockedByViewer = rel({ blockedByViewer: true });
const blockedViewer = rel({ blockedViewer: true });

const post = (overrides = {}) => ({
  authorId: 'author',
  visibility: 'PUBLIC' as const,
  moderationStatus: 'APPROVED' as const,
  ...overrides,
});

describe('post.policy', () => {
  describe('canViewPost', () => {
    const author = { id: 'author' };

    it.each([
      ['public approved, stranger', post(), stranger, true],
      ['public approved, friend', post(), friend, true],
      [
        'public pending, stranger',
        post({ moderationStatus: 'PENDING' }),
        stranger,
        false,
      ],
      [
        'public rejected, stranger',
        post({ moderationStatus: 'REJECTED' }),
        stranger,
        false,
      ],
      ['friends, stranger', post({ visibility: 'FRIENDS' }), stranger, false],
      ['friends, friend', post({ visibility: 'FRIENDS' }), friend, true],
      ['private, friend', post({ visibility: 'PRIVATE' }), friend, false],
      ['public, blocked by viewer', post(), blockedByViewer, false],
      ['public, viewer blocked', post(), blockedViewer, false],
      [
        'friends, friend flag but blocked',
        post({ visibility: 'FRIENDS' }),
        rel({ isFriend: true, blockedViewer: true }),
        false,
      ],
    ])('%s -> %s', (_name, p, relationship, expected) => {
      expect(canViewPost({ id: 'viewer' }, p, author, relationship)).toBe(
        expected,
      );
    });

    it('lets the author see all of their own posts', () => {
      for (const visibility of ['PUBLIC', 'FRIENDS', 'PRIVATE'] as const) {
        for (const moderationStatus of [
          'APPROVED',
          'PENDING',
          'REJECTED',
        ] as const) {
          expect(
            canViewPost(
              { id: 'author' },
              post({ visibility, moderationStatus }),
              { id: 'author', isPrivate: true },
              SELF_RELATIONSHIP,
            ),
          ).toBe(true);
        }
      }
    });

    it('hides posts of private accounts from non-friends and anonymous', () => {
      const privateAuthor = { id: 'author', isPrivate: true };
      expect(
        canViewPost({ id: 'viewer' }, post(), privateAuthor, stranger),
      ).toBe(false);
      expect(canViewPost({}, post(), privateAuthor, NO_RELATIONSHIP)).toBe(
        false,
      );
      expect(canViewPost({ id: 'viewer' }, post(), privateAuthor, friend)).toBe(
        true,
      );
    });

    it('allows anonymous viewers on approved public posts only', () => {
      expect(canViewPost({}, post(), author, NO_RELATIONSHIP)).toBe(true);
      expect(
        canViewPost(
          {},
          post({ visibility: 'FRIENDS' }),
          author,
          NO_RELATIONSHIP,
        ),
      ).toBe(false);
    });

    it('reports a typed denial reason', () => {
      const view = (p: object, relationship: Relationship) =>
        decidePostView({ id: 'viewer' }, post(p), author, relationship).reason;

      expect(view({}, blockedByViewer)).toBe('NOT_FOUND');
      expect(view({ moderationStatus: 'PENDING' }, stranger)).toBe(
        'AWAITING_MODERATION',
      );
      expect(view({ visibility: 'PRIVATE' }, stranger)).toBe('PRIVATE');
      expect(view({ visibility: 'FRIENDS' }, stranger)).toBe('FRIENDS_ONLY');
      expect(view({}, stranger)).toBeUndefined();
    });

    it('treats a missing author record as not private', () => {
      expect(canViewPost({ id: 'viewer' }, post(), null, stranger)).toBe(true);
    });
  });

  describe('canViewAuthorPage', () => {
    it.each([
      ['stranger', stranger, false, true],
      ['blocked by viewer', blockedByViewer, false, false],
      ['viewer blocked', blockedViewer, false, false],
      ['private, stranger', stranger, true, false],
      ['private, friend', friend, true, true],
      ['self', SELF_RELATIONSHIP, true, true],
    ])('%s -> %s', (_n, relationship, isPrivate, expected) => {
      const viewerId = relationship.isSelf ? 'author' : 'viewer';
      expect(
        canViewAuthorPage(
          { id: viewerId },
          { id: 'author', isPrivate },
          relationship,
        ),
      ).toBe(expected);
    });
  });

  describe('canEditPost / canDeletePost', () => {
    it('only the author may edit or delete', () => {
      expect(canEditPost({ id: 'author' }, post())).toBe(true);
      expect(canEditPost({ id: 'other' }, post())).toBe(false);
      expect(canEditPost({}, post())).toBe(false);
      expect(canDeletePost({ id: 'author' }, post())).toBe(true);
      expect(canDeletePost({ id: 'other' }, post())).toBe(false);
    });
  });

  describe('canReact / canShare', () => {
    const author = { id: 'author' };

    it.each([
      ['stranger', stranger, true],
      ['friend', friend, true],
      ['blocked by viewer', blockedByViewer, false],
      ['viewer blocked', blockedViewer, false],
    ])('public post, %s -> %s', (_n, relationship, expected) => {
      expect(canReact({ id: 'viewer' }, post(), author, relationship)).toBe(
        expected,
      );
      expect(canShare({ id: 'viewer' }, post(), author, relationship)).toBe(
        expected,
      );
    });

    it('denies anonymous viewers', () => {
      expect(canReact({}, post(), author, NO_RELATIONSHIP)).toBe(false);
      expect(canShare({}, post(), author, NO_RELATIONSHIP)).toBe(false);
    });

    it('requires the post to be viewable', () => {
      expect(
        canReact(
          { id: 'viewer' },
          post({ visibility: 'FRIENDS' }),
          author,
          stranger,
        ),
      ).toBe(false);
    });
  });
});
