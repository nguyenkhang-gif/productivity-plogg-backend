import { FriendshipStatus } from './friendship.entity';

export interface Relationship {
  isSelf: boolean;
  isFriend: boolean;
  blockedByViewer: boolean;
  blockedViewer: boolean;
}

export interface FriendshipEdge {
  userId: string;
  friendId: string;
  status: FriendshipStatus;
}

export const SELF_RELATIONSHIP: Relationship = Object.freeze({
  isSelf: true,
  isFriend: false,
  blockedByViewer: false,
  blockedViewer: false,
});

export const NO_RELATIONSHIP: Relationship = Object.freeze({
  isSelf: false,
  isFriend: false,
  blockedByViewer: false,
  blockedViewer: false,
});

export function isBlockedEitherWay(relationship: Relationship): boolean {
  return relationship.blockedByViewer || relationship.blockedViewer;
}

export function relationshipFromEdge(
  viewerId: string,
  otherId: string,
  edge: FriendshipEdge | null | undefined,
): Relationship {
  if (viewerId === otherId) return SELF_RELATIONSHIP;
  if (!edge) return NO_RELATIONSHIP;
  return {
    isSelf: false,
    isFriend: edge.status === 'accepted',
    blockedByViewer: edge.status === 'blocked' && edge.userId === viewerId,
    blockedViewer: edge.status === 'blocked' && edge.userId !== viewerId,
  };
}

export function blockedIdsFromEdges(
  viewerId: string,
  edges: FriendshipEdge[],
): string[] {
  const ids = new Set<string>();
  for (const edge of edges) {
    if (edge.status !== 'blocked') continue;
    ids.add(edge.userId === viewerId ? edge.friendId : edge.userId);
  }
  ids.delete(viewerId);
  return Array.from(ids);
}
