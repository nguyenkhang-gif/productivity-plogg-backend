import { ObjectId } from 'bson';
import { transformCategory, transformTag } from './taxonomy.migrators';
import { transformFriendship } from './friendships.migrator';
import { transformPost, transformPostTags } from './posts.migrator';
import {
  transformBookmark,
  transformComment,
  transformReaction,
} from './engagement.migrators';
import { orderMigrators } from '../migrator';
import { MIGRATORS } from '../registry';

const oid = (hex: string) => new ObjectId(hex);
const ID = '64b7f0c2a1b2c3d4e5f60718';
const USER_A = '64b7f0c2a1b2c3d4e5f60001';
const USER_B = '64b7f0c2a1b2c3d4e5f60002';
const POST = '64b7f0c2a1b2c3d4e5f60100';
const CAT = '64b7f0c2a1b2c3d4e5f60200';
const TAG_1 = '64b7f0c2a1b2c3d4e5f60301';
const TAG_2 = '64b7f0c2a1b2c3d4e5f60302';
const createdAt = new Date('2024-01-02T03:04:05.000Z');
const updatedAt = new Date('2024-02-03T04:05:06.000Z');

describe('transformCategory / transformTag', () => {
  it('maps a complete document and carries the counter as stored', () => {
    const doc = {
      _id: oid(ID),
      name: 'Tech',
      slug: 'tech',
      postCount: 12,
      createdAt,
      updatedAt,
      __v: 0,
    };
    const expected = {
      id: ID,
      name: 'Tech',
      slug: 'tech',
      postCount: 12,
      createdAt,
      updatedAt,
    };
    expect(transformCategory(doc)).toEqual(expected);
    expect(transformTag(doc)).toEqual(expected);
  });

  it('defaults legacy documents without counter or timestamps', () => {
    const row = transformTag({ _id: oid(ID), name: 'Old', slug: 'old' })!;
    expect(row.postCount).toBe(0);
    expect(row.createdAt).toEqual(new ObjectId(ID).getTimestamp());
    expect(row.updatedAt).toEqual(row.createdAt);
  });

  it('repairs a corrupt counter to 0 and skips documents without name or slug', () => {
    expect(
      transformCategory({ _id: oid(ID), name: 'x', slug: 'x', postCount: -3 })!
        .postCount,
    ).toBe(0);
    expect(
      transformCategory({ _id: oid(ID), name: 'x', slug: 'x', postCount: '4' })!
        .postCount,
    ).toBe(0);
    expect(transformCategory({ _id: oid(ID), name: 'x' })).toBeNull();
    expect(transformTag({ _id: oid(ID), slug: 'x' })).toBeNull();
    expect(transformTag({ name: 'x', slug: 'x' })).toBeNull();
  });
});

describe('transformFriendship', () => {
  it('keeps the acting user as userId and the status', () => {
    expect(
      transformFriendship({
        _id: oid(ID),
        userId: USER_A,
        friendId: USER_B,
        status: 'blocked',
        createdAt,
        updatedAt,
      }),
    ).toEqual({
      id: ID,
      userId: USER_A,
      friendId: USER_B,
      status: 'blocked',
      createdAt,
      updatedAt,
    });
  });

  it('treats a missing status like the Mongo default (pending)', () => {
    expect(
      transformFriendship({ _id: oid(ID), userId: USER_A, friendId: USER_B })!
        .status,
    ).toBe('pending');
  });

  it('skips unknown statuses, self edges and invalid ids', () => {
    const base = { _id: oid(ID), userId: USER_A, friendId: USER_B };
    expect(transformFriendship({ ...base, status: 'declined' })).toBeNull();
    expect(transformFriendship({ ...base, friendId: USER_A })).toBeNull();
    expect(transformFriendship({ ...base, friendId: 'not-an-id' })).toBeNull();
    expect(transformFriendship({ ...base, userId: undefined })).toBeNull();
  });
});

describe('transformPost', () => {
  it('maps a complete post', () => {
    const moderatedAt = new Date('2024-03-01T00:00:00.000Z');
    const row = transformPost({
      _id: oid(POST),
      authorId: USER_A,
      type: 'ORIGINAL',
      title: 'Hello',
      content: 'World',
      imageUrls: ['a.png', 'b.png'],
      isPublished: true,
      categoryId: CAT,
      tagIds: [TAG_1],
      viewCount: 7,
      shareCount: 2,
      visibility: 'FRIENDS',
      moderationStatus: 'REJECTED',
      moderatedBy: USER_B,
      moderatedAt,
      rejectionReason: 'spam',
      originalPostId: null,
      caption: null,
      createdAt,
      updatedAt,
      __v: 3,
    });
    expect(row).toEqual({
      id: POST,
      authorId: USER_A,
      type: 'ORIGINAL',
      title: 'Hello',
      content: 'World',
      imageUrls: ['a.png', 'b.png'],
      isPublished: true,
      categoryId: CAT,
      viewCount: 7,
      shareCount: 2,
      visibility: 'FRIENDS',
      moderationStatus: 'REJECTED',
      moderatedBy: USER_B,
      moderatedAt,
      rejectionReason: 'spam',
      originalPostId: null,
      caption: null,
      createdAt,
      updatedAt,
    });
    expect(row).not.toHaveProperty('tagIds');
    expect(row).not.toHaveProperty('reactCount');
  });

  it('applies the Mongo defaults to legacy documents', () => {
    const row = transformPost({ _id: oid(POST), authorId: USER_A })!;
    expect(row).toMatchObject({
      type: 'ORIGINAL',
      title: null,
      content: '',
      imageUrls: [],
      isPublished: true,
      categoryId: null,
      viewCount: 0,
      shareCount: 0,
      visibility: 'PUBLIC',
      // posts predating moderation are live
      moderationStatus: 'APPROVED',
      moderatedBy: null,
      moderatedAt: null,
      rejectionReason: null,
      originalPostId: null,
      caption: null,
    });
    expect(row.createdAt).toEqual(new ObjectId(POST).getTimestamp());
  });

  it('only an explicit false unpublishes; garbage enums fall back to defaults', () => {
    expect(
      transformPost({ _id: oid(POST), authorId: USER_A, isPublished: false })!
        .isPublished,
    ).toBe(false);
    expect(
      transformPost({ _id: oid(POST), authorId: USER_A, isPublished: 0 })!
        .isPublished,
    ).toBe(true);
    const row = transformPost({
      _id: oid(POST),
      authorId: USER_A,
      type: 'weird',
      visibility: 'EVERYONE',
      moderationStatus: 'MAYBE',
    })!;
    expect(row).toMatchObject({
      type: 'ORIGINAL',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
    });
  });

  it('maps reposts with their original and caption; drops originalPostId on originals', () => {
    const original = '64b7f0c2a1b2c3d4e5f60099';
    const repost = transformPost({
      _id: oid(POST),
      authorId: USER_B,
      type: 'REPOST',
      originalPostId: original,
      caption: 'worth reading',
      content: '',
    })!;
    expect(repost).toMatchObject({
      type: 'REPOST',
      originalPostId: original,
      caption: 'worth reading',
    });
    expect(
      transformPost({
        _id: oid(POST),
        authorId: USER_A,
        originalPostId: original,
      })!.originalPostId,
    ).toBeNull();
  });

  it('skips reposts without an original and posts without id or author', () => {
    expect(
      transformPost({ _id: oid(POST), authorId: USER_A, type: 'REPOST' }),
    ).toBeNull();
    expect(
      transformPost({
        _id: oid(POST),
        authorId: USER_A,
        type: 'REPOST',
        originalPostId: 'garbage',
      }),
    ).toBeNull();
    expect(transformPost({ _id: oid(POST) })).toBeNull();
    expect(transformPost({ _id: oid(POST), authorId: 'not-hex' })).toBeNull();
    expect(transformPost({ authorId: USER_A })).toBeNull();
  });

  it('cleans arrays and clips over-long legacy text to the column size', () => {
    const row = transformPost({
      _id: oid(POST),
      authorId: USER_A,
      imageUrls: ['ok.png', '', null, 42],
      caption: 'c'.repeat(400),
      rejectionReason: 'r'.repeat(900),
      viewCount: -1,
      shareCount: 1.5,
      categoryId: 'dangling-not-hex',
    })!;
    expect(row.imageUrls).toEqual(['ok.png']);
    expect(row.caption).toHaveLength(280);
    expect(row.rejectionReason).toHaveLength(500);
    expect(row.viewCount).toBe(0);
    expect(row.shareCount).toBe(0);
    expect(row.categoryId).toBeNull();
    expect(
      transformPost({ _id: oid(POST), authorId: USER_A, imageUrls: 'x.png' })!
        .imageUrls,
    ).toEqual([]);
  });
});

describe('transformPostTags', () => {
  it('returns the unique valid tag ids of a post', () => {
    expect(
      transformPostTags({
        _id: oid(POST),
        tagIds: [TAG_1, TAG_2, TAG_1, 'junk', null, oid(TAG_2)],
      }),
    ).toEqual({ postId: POST, tagIds: [TAG_1, TAG_2] });
  });

  it('returns an empty list for legacy posts without tagIds, null without an id', () => {
    expect(transformPostTags({ _id: oid(POST) })).toEqual({
      postId: POST,
      tagIds: [],
    });
    expect(transformPostTags({ _id: oid(POST), tagIds: 'x' })).toEqual({
      postId: POST,
      tagIds: [],
    });
    expect(transformPostTags({ tagIds: [TAG_1] })).toBeNull();
  });
});

describe('transformComment', () => {
  it('maps a comment with and without an icon', () => {
    const doc = {
      _id: oid(ID),
      postId: POST,
      authorId: USER_A,
      content: 'nice',
      iconUrl: 'https://img/x.gif',
      createdAt,
      updatedAt,
      __v: 0,
    };
    expect(transformComment(doc)).toEqual({
      id: ID,
      postId: POST,
      authorId: USER_A,
      content: 'nice',
      iconUrl: 'https://img/x.gif',
      createdAt,
      updatedAt,
    });
    expect(
      transformComment({ ...doc, iconUrl: undefined })!.iconUrl,
    ).toBeNull();
  });

  it('accepts ObjectId-typed references and falls back to the _id timestamp', () => {
    const row = transformComment({
      _id: oid(ID),
      postId: oid(POST),
      authorId: oid(USER_A),
      content: 'x',
    })!;
    expect(row.postId).toBe(POST);
    expect(row.authorId).toBe(USER_A);
    expect(row.createdAt).toEqual(new ObjectId(ID).getTimestamp());
  });

  it('skips comments with no content or broken references', () => {
    const base = { _id: oid(ID), postId: POST, authorId: USER_A, content: 'x' };
    expect(transformComment({ ...base, content: '' })).toBeNull();
    expect(transformComment({ ...base, content: undefined })).toBeNull();
    expect(transformComment({ ...base, postId: 'x' })).toBeNull();
    expect(transformComment({ ...base, authorId: undefined })).toBeNull();
  });
});

describe('transformReaction / transformBookmark', () => {
  it('maps a reaction, nulling a missing icon', () => {
    expect(
      transformReaction({
        _id: oid(ID),
        postId: POST,
        userId: USER_A,
        type: 'love',
        icon: '❤',
        createdAt,
        updatedAt,
      }),
    ).toEqual({
      id: ID,
      postId: POST,
      userId: USER_A,
      type: 'love',
      icon: '❤',
      createdAt,
      updatedAt,
    });
    expect(
      transformReaction({
        _id: oid(ID),
        postId: POST,
        userId: USER_A,
        type: 'like',
      })!.icon,
    ).toBeNull();
  });

  it('skips reactions without a type or references', () => {
    const base = { _id: oid(ID), postId: POST, userId: USER_A, type: 'like' };
    expect(transformReaction({ ...base, type: undefined })).toBeNull();
    expect(transformReaction({ ...base, postId: undefined })).toBeNull();
    expect(transformReaction({ ...base, userId: 'bad' })).toBeNull();
  });

  it('maps bookmarks and skips broken ones', () => {
    expect(
      transformBookmark({
        _id: oid(ID),
        postId: POST,
        userId: USER_A,
        createdAt,
      }),
    ).toEqual({
      id: ID,
      postId: POST,
      userId: USER_A,
      createdAt,
      updatedAt: createdAt,
    });
    expect(transformBookmark({ _id: oid(ID), postId: POST })).toBeNull();
  });
});

describe('registry order', () => {
  it('runs users first, originals before dependents', () => {
    const names = orderMigrators(MIGRATORS).map((m) => m.name);
    const before = (a: string, b: string) =>
      expect(names.indexOf(a)).toBeLessThan(names.indexOf(b));
    before('users', 'friendships');
    before('categories', 'posts');
    before('posts', 'post_tags');
    before('tags', 'post_tags');
    before('posts', 'comments');
    before('posts', 'reactions');
    before('posts', 'bookmarks');
    expect(new Set(names).size).toBe(names.length);
  });
});
