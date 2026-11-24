import { ObjectId } from 'bson';

export function newObjectId(): string {
  return new ObjectId().toHexString();
}

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
}
