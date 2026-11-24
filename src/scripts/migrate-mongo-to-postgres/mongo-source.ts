import { MongoClient } from 'mongodb';
import type { MigrationSource } from './migrator';

export class MongoMigrationSource implements MigrationSource {
  private constructor(private readonly client: MongoClient) {}

  static async connect(uri: string): Promise<MongoMigrationSource> {
    const client = new MongoClient(uri);
    await client.connect();
    return new MongoMigrationSource(client);
  }

  count(collection: string): Promise<number> {
    return this.client.db().collection(collection).countDocuments({});
  }

  async *read(collection: string, batchSize: number) {
    const cursor = this.client
      .db()
      .collection(collection)
      .find({})
      .sort({ _id: 1 })
      .batchSize(batchSize);
    let batch: any[] = [];
    try {
      for await (const doc of cursor) {
        batch.push(doc);
        if (batch.length >= batchSize) {
          yield batch;
          batch = [];
        }
      }
      if (batch.length) yield batch;
    } finally {
      await cursor.close();
    }
  }

  close(): Promise<void> {
    return this.client.close();
  }
}
