// Usage: node scripts/seed-posts.js
// Paste your userId vào biến AUTHOR_ID bên dưới trước khi chạy

const { MongoClient } = require('mongodb');
require('dotenv').config();

const AUTHOR_ID = '69ec688ca65da460d460254b'; // ← thay bằng userId thật
const TOTAL = 1000;
const BATCH_SIZE = 100;

const SAMPLE_CONTENTS = [
  'Hôm nay học được một điều thú vị về clean architecture.',
  'Redis cache giúp giảm tải MongoDB đáng kể trong production.',
  'NestJS và MongoDB là một combo mạnh cho backend.',
  'Đang đọc sách về system design, nhiều thứ hay lắm.',
  'Deploy lên AWS EC2 với PM2, ổn định hơn nhiều rồi.',
  'Typescript strict mode bắt được khá nhiều bug tiềm ẩn.',
  'Hôm nay fix một bug khó, cảm giác rất đã.',
  'Bắt đầu học Docker để containerize app.',
  'CI/CD với GitHub Actions tiết kiệm rất nhiều thời gian.',
  'Code review quan trọng hơn mình nghĩ, học được nhiều từ feedback.',
];

function randomContent() {
  const base = SAMPLE_CONTENTS[Math.floor(Math.random() * SAMPLE_CONTENTS.length)];
  const suffix = ` (${Math.random().toString(36).slice(2, 8)})`;
  return base + suffix;
}

function randomDate(daysBack = 90) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

function buildBatch(size, index) {
  return Array.from({ length: size }, (_, i) => ({
    authorId: AUTHOR_ID,
    content: randomContent(),
    imageUrls: [],
    isPublished: true,
    createdAt: randomDate(),
    updatedAt: new Date(),
    __v: 0,
  }));
}

async function main() {
  if (AUTHOR_ID === 'PASTE_YOUR_USER_ID_HERE') {
    console.error('❌ Chưa set AUTHOR_ID. Mở script và thay giá trị AUTHOR_ID.');
    process.exit(1);
  }

  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    console.error('❌ MONGO_DB_URI không có trong .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  console.log('✓ Connected to MongoDB');

  const db = client.db();
  const collection = db.collection('posts');

  let inserted = 0;
  const batches = Math.ceil(TOTAL / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const size = Math.min(BATCH_SIZE, TOTAL - inserted);
    const docs = buildBatch(size, i);
    await collection.insertMany(docs);
    inserted += size;
    process.stdout.write(`\r⏳ Đã insert: ${inserted}/${TOTAL}`);
  }

  console.log(`\n✅ Xong! Đã tạo ${inserted} posts cho authorId: ${AUTHOR_ID}`);
  await client.close();
}

main().catch((err) => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
