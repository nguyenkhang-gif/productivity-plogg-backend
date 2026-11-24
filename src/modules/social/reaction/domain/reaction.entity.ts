export class Reaction {
  id: string;
  postId: string;
  userId: string;
  type: string;
  icon?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<Reaction>) {
    Object.assign(this, partial);
  }
}
