import { Relationship, isBlockedEitherWay } from './relationship';

export function canViewProfile(
  viewer: { id?: string },
  target: { id: string },
  relationship: Relationship,
): boolean {
  if (viewer.id !== undefined && viewer.id === target.id) return true;
  return !isBlockedEitherWay(relationship);
}
