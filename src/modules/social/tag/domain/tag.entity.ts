export class Tag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt?: Date;

  constructor(partial: Partial<Tag>) {
    Object.assign(this, partial);
  }
}
