export class Epub {
  id: string;
  sampleUrl?: string;
  createdUserId: string;
  properties: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<Epub>) {
    Object.assign(this, partial);
  }
}
