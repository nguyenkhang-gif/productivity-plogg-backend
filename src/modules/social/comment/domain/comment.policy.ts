import { Relationship } from '../../friendship/domain/relationship';
import {
  PolicyPost,
  PolicyPostAuthor,
  PolicyViewer,
  canInteractWithPost,
} from '../../post/domain/post.policy';

export interface PolicyComment {
  authorId: string;
}

const isAuthorOf = (viewer: PolicyViewer, comment: PolicyComment) =>
  viewer.id !== undefined && viewer.id === comment.authorId;

export function canComment(
  viewer: PolicyViewer,
  post: PolicyPost,
  author: PolicyPostAuthor | null | undefined,
  relationship: Relationship,
): boolean {
  return canInteractWithPost(viewer, post, author, relationship);
}

export function canEditComment(
  viewer: PolicyViewer,
  comment: PolicyComment,
): boolean {
  return isAuthorOf(viewer, comment);
}

export function canDeleteComment(
  viewer: PolicyViewer,
  comment: PolicyComment,
): boolean {
  return isAuthorOf(viewer, comment);
}
