import {
  Relationship,
  NO_RELATIONSHIP,
  isBlockedEitherWay,
} from '../../friendship/domain/relationship';
import { PostModerationStatus, PostVisibility } from './post.entity';

export interface PolicyViewer {
  id?: string;
}

export interface PolicyPost {
  authorId: string;
  visibility?: PostVisibility;
  moderationStatus?: PostModerationStatus;
}

export interface PolicyPostAuthor {
  id: string;
  isPrivate?: boolean;
}

export type PostViewDenial =
  | 'NOT_FOUND'
  | 'AWAITING_MODERATION'
  | 'PRIVATE'
  | 'FRIENDS_ONLY';

export interface PostViewDecision {
  allowed: boolean;
  reason?: PostViewDenial;
}

const isAuthorOf = (viewer: PolicyViewer, post: { authorId: string }) =>
  viewer.id !== undefined && viewer.id === post.authorId;

export function isAuthorHiddenByPrivacy(
  viewer: PolicyViewer,
  author: PolicyPostAuthor | null | undefined,
  relationship: Relationship = NO_RELATIONSHIP,
): boolean {
  if (!author?.isPrivate) return false;
  if (viewer.id !== undefined && viewer.id === author.id) return false;
  if (viewer.id === undefined) return true;
  return !relationship.isFriend;
}

export function canViewAuthorPage(
  viewer: PolicyViewer,
  author: PolicyPostAuthor,
  relationship: Relationship,
): boolean {
  if (viewer.id !== undefined && viewer.id === author.id) return true;
  if (isBlockedEitherWay(relationship)) return false;
  return !isAuthorHiddenByPrivacy(viewer, author, relationship);
}

export function decidePostView(
  viewer: PolicyViewer,
  post: PolicyPost,
  author: PolicyPostAuthor | null | undefined,
  relationship: Relationship = NO_RELATIONSHIP,
): PostViewDecision {
  const isAuthor = isAuthorOf(viewer, post);

  if (!isAuthor && isBlockedEitherWay(relationship)) {
    return { allowed: false, reason: 'NOT_FOUND' };
  }
  if (isAuthorHiddenByPrivacy(viewer, author, relationship)) {
    return { allowed: false, reason: 'NOT_FOUND' };
  }

  const visibility = post.visibility ?? 'PUBLIC';
  const moderationStatus = post.moderationStatus ?? 'APPROVED';

  if (visibility === 'PUBLIC' && moderationStatus !== 'APPROVED' && !isAuthor) {
    return { allowed: false, reason: 'AWAITING_MODERATION' };
  }
  if (visibility === 'PRIVATE' && !isAuthor) {
    return { allowed: false, reason: 'PRIVATE' };
  }
  if (visibility === 'FRIENDS' && !isAuthor) {
    if (viewer.id === undefined || !relationship.isFriend) {
      return { allowed: false, reason: 'FRIENDS_ONLY' };
    }
  }
  return { allowed: true };
}

export function canViewPost(
  viewer: PolicyViewer,
  post: PolicyPost,
  author: PolicyPostAuthor | null | undefined,
  relationship: Relationship = NO_RELATIONSHIP,
): boolean {
  return decidePostView(viewer, post, author, relationship).allowed;
}

export function canEditPost(viewer: PolicyViewer, post: PolicyPost): boolean {
  return isAuthorOf(viewer, post);
}

export function canDeletePost(viewer: PolicyViewer, post: PolicyPost): boolean {
  return isAuthorOf(viewer, post);
}

export function canInteractWithPost(
  viewer: PolicyViewer,
  post: PolicyPost,
  author: PolicyPostAuthor | null | undefined,
  relationship: Relationship,
): boolean {
  if (viewer.id === undefined) return false;
  if (!isAuthorOf(viewer, post) && isBlockedEitherWay(relationship)) {
    return false;
  }
  return canViewPost(viewer, post, author, relationship);
}

export const canReact = canInteractWithPost;
export const canShare = canInteractWithPost;
