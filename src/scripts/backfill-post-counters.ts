/**
 * Tính lại `reactCount` / `commentCount` trên collection `posts` từ nguồn sự
 * thật (`reactions`, `comments`).
 *
 * Script này có HAI vai trò, nên phải chạy lại được nhiều lần:
 *
 *   1. BACKFILL  — lấp giá trị cho post cũ (chạy một lần, sau khi deploy $inc)
 *   2. ĐỐI SOÁT  — phát hiện drift do $inc ghi hụt (chạy định kỳ)
 *
 * Mặc định là DRY-RUN: chỉ in ra số lệch, không ghi gì. Thêm `--apply` để ghi.
 *
 * Chạy:
 *   npx ts-node -r tsconfig-paths/register src/scripts/backfill-post-counters.ts
 *   npx ts-node -r tsconfig-paths/register src/scripts/backfill-post-counters.ts --apply
 *
 * LƯU Ý: chạy SAU khi deploy code $inc, không phải trước — nếu không sẽ mất
 * phần delta phát sinh giữa lúc backfill và lúc deploy.
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const SAMPLE_LIMIT = 10; // số dòng lệch in ra để soi

type Counts = { react: number; comment: number };

/** Đếm theo postId từ một collection nguồn. postId trong đó là string. */
async function countBySource(
  db: mongoose.mongo.Db,
  collection: 'reactions' | 'comments',
): Promise<Map<string, number>> {
  const rows = await db
    .collection(collection)
    .aggregate([{ $group: { _id: '$postId', n: { $sum: 1 } } }], {
      allowDiskUse: true,
    })
    .toArray();

  return new Map(rows.map((r: any) => [String(r._id), r.n as number]));
}

async function main() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('Thiếu MONGO_DB_URI');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Kết nối: ${db.databaseName}`);
  console.log(APPLY ? 'Chế độ: APPLY (sẽ ghi)' : 'Chế độ: DRY-RUN (chỉ đọc)');
  console.log('');

  const [reactMap, commentMap] = await Promise.all([
    countBySource(db, 'reactions'),
    countBySource(db, 'comments'),
  ]);
  console.log(
    `Nguồn: ${reactMap.size} post có reaction · ${commentMap.size} post có comment`,
  );

  // Duyệt toàn bộ posts bằng cursor — 10k doc, không nạp hết vào RAM
  const cursor = db
    .collection('posts')
    .find({}, { projection: { reactCount: 1, commentCount: 1 } });

  const ops: mongoose.mongo.AnyBulkWriteOperation[] = [];
  const samples: string[] = [];
  let total = 0;
  let drifted = 0;

  for await (const doc of cursor) {
    total += 1;
    const id = doc._id.toString();

    const actual: Counts = {
      react: reactMap.get(id) ?? 0,
      comment: commentMap.get(id) ?? 0,
    };
    const stored: Counts = {
      react: (doc as any).reactCount ?? 0,
      comment: (doc as any).commentCount ?? 0,
    };

    if (stored.react === actual.react && stored.comment === actual.comment) {
      continue;
    }

    drifted += 1;
    if (samples.length < SAMPLE_LIMIT) {
      samples.push(
        `  ${id}  react ${stored.react} → ${actual.react}` +
          `   comment ${stored.comment} → ${actual.comment}`,
      );
    }

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: { reactCount: actual.react, commentCount: actual.comment },
        },
      },
    });
  }

  console.log(`Quét: ${total} post · lệch: ${drifted}`);
  if (samples.length) {
    console.log(`\nMẫu (tối đa ${SAMPLE_LIMIT}):`);
    samples.forEach((s) => console.log(s));
  }

  if (drifted === 0) {
    console.log('\n✓ Không lệch — counter khớp nguồn sự thật.');
  } else if (!APPLY) {
    console.log(
      `\nDRY-RUN: chưa ghi gì. Chạy lại với --apply để cập nhật ${drifted} post.`,
    );
  } else {
    // bulkWrite theo lô 1000 để tránh vượt giới hạn kích thước lệnh
    let written = 0;
    for (let i = 0; i < ops.length; i += 1000) {
      const res = await db
        .collection('posts')
        .bulkWrite(ops.slice(i, i + 1000), { ordered: false });
      written += res.modifiedCount;
    }
    console.log(`\n✓ Đã cập nhật ${written} post.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('LỖI:', err.message);
  process.exit(1);
});
