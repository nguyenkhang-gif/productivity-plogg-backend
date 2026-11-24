import {
  NO_RELATIONSHIP,
  Relationship,
} from '../../friendship/domain/relationship';
import { canComment, canDeleteComment, canEditComment } from './comment.policy';

const rel = (partial: Partial<Relationship>): Relationship => ({
  ...NO_RELATIONSHIP,
  ...partial,
});

const publicPost = {
  authorId: 'author',
  visibility: 'PUBLIC' as const,
  moderationStatus: 'APPROVED' as const,
};

describe('comment.policy', () => {
  describe('canComment', () => {
    it.each([
      ['stranger', rel({}), true],
      ['friend', rel({ isFriend: true }), true],
      ['blocked by viewer', rel({ blockedByViewer: true }), false],
      ['viewer blocked', rel({ blockedViewer: true }), false],
    ])('public post, %s -> %s', (_n, relationship, expected) => {
      expect(
        canComment(
          { id: 'viewer' },
          publicPost,
          { id: 'author' },
          relationship,
        ),
      ).toBe(expected);
    });

    it('denies anonymous viewers and invisible posts', () => {
      expect(canComment({}, publicPost, null, NO_RELATIONSHIP)).toBe(false);
      expect(
        canComment(
          { id: 'viewer' },
          { ...publicPost, visibility: 'PRIVATE' },
          null,
          NO_RELATIONSHIP,
        ),
      ).toBe(false);
    });
  });

  describe('canEditComment / canDeleteComment', () => {
    it('only the comment author may edit or delete', () => {
      const comment = { authorId: 'c1' };
      expect(canEditComment({ id: 'c1' }, comment)).toBe(true);
      expect(canEditComment({ id: 'author' }, comment)).toBe(false);
      expect(canEditComment({}, comment)).toBe(false);
      expect(canDeleteComment({ id: 'c1' }, comment)).toBe(true);
      expect(canDeleteComment({ id: 'author' }, comment)).toBe(false);
    });
  });
});
