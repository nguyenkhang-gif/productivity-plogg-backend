export class Category {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt?: Date;

  constructor(partial: Partial<Category>) {
    Object.assign(this, partial);
  }
}
