export class Bookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt?: Date;

  constructor(partial: Partial<Bookmark>) {
    Object.assign(this, partial);
  }
}
