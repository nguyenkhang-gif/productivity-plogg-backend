export interface PostAuthor {
  id: string;
  fullName: string;
  username: string;
  profilePic?: string;
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
}

export interface PostTag {
  id: string;
  name: string;
  slug: string;
}

export interface UserReaction {
  type: string;
  icon?: string;
}

export type PostType = 'ORIGINAL' | 'REPOST';
export type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type PostModerationStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

/**
 * Derive the moderation status of a post from its visibility.
 * - Non-PUBLIC posts (FRIENDS/PRIVATE) never need review → APPROVED.
 * - A new PUBLIC post enters the queue → PENDING.
 * - Editing the content of an already-APPROVED PUBLIC post forces re-review → PENDING.
 * - An untouched PUBLIC post keeps its prior status.
 */
export function deriveModerationStatus(
  visibility: PostVisibility,
  opts: { isContentChanged?: boolean; prevStatus?: PostModerationStatus } = {},
): PostModerationStatus {
  if (visibility !== 'PUBLIC') return 'APPROVED';
  if (opts.prevStatus === 'APPROVED' && opts.isContentChanged) return 'PENDING';
  return opts.prevStatus ?? 'PENDING';
}

export class Post {
  id: string;
  authorId: string;
  type: PostType;
  visibility: PostVisibility;
  title?: string;
  content: string;
  imageUrls?: string[];
  categoryId?: string | null;
  tagIds?: string[];
  viewCount?: number;
  reactCount: number;
  shareCount: number;
  isPublished: boolean;
  moderationStatus: PostModerationStatus;
  moderatedBy?: string | null;
  moderatedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  author?: PostAuthor;
  category?: PostCategory | null;
  tags?: PostTag[];
  isBookmarked?: boolean;
  commentCount?: number;
  userReaction?: UserReaction | null;
  // repost fields
  originalPostId?: string;
  caption?: string;
  originalPost?: Post | null;
  hasShared?: boolean;

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
  }
}
