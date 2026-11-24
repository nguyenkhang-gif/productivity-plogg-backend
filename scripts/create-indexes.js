// node scripts/create-indexes.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function safeCreateIndex(collection, spec) {
  try {
    await collection.createIndex(spec);
    console.log(`  ✓ ${collection.collectionName}: ${JSON.stringify(spec)}`);
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      console.log(`  ~ ${collection.collectionName}: ${JSON.stringify(spec)} (already exists)`);
    } else {
      throw err;
    }
  }
}

async function main() {
  const client = new MongoClient(process.env.MONGO_DB_URI);
  await client.connect();
  const db = client.db();

  console.log('Creating indexes...\n');

  // posts — match + sort (dùng cho findAll)
  await safeCreateIndex(db.collection('posts'), { isPublished: 1, createdAt: -1 });
  // posts — match + sort (dùng cho findByAuthor)
  await safeCreateIndex(db.collection('posts'), { authorId: 1, isPublished: 1, createdAt: -1 });

  // friendships — visibility lookup (cả 2 chiều)
  await safeCreateIndex(db.collection('friendships'), { userId: 1, status: 1 });
  await safeCreateIndex(db.collection('friendships'), { friendId: 1, status: 1 });

  // comments — commentCount lookup
  await safeCreateIndex(db.collection('comments'), { postId: 1 });

  // reactions — reactCount + userReaction lookup
  await safeCreateIndex(db.collection('reactions'), { postId: 1 });
  await safeCreateIndex(db.collection('reactions'), { postId: 1, userId: 1 });

  console.log('\n✅ Done');
  await client.close();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
