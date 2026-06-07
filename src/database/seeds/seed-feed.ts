/**
 * Seed only the new feed entities: categories + tags.
 * Does NOT touch users, posts, friendships, or bookmarks.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/database/seeds/seed-feed.ts
 *   or: npm run seed:feed
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const CategorySchema = new mongoose.Schema(
  { name: String, slug: { type: String, unique: true }, postCount: { type: Number, default: 0 } },
  { timestamps: true },
);

const TagSchema = new mongoose.Schema(
  { name: String, slug: { type: String, unique: true }, postCount: { type: Number, default: 0 } },
  { timestamps: true },
);

async function seedFeed() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('MONGO_DB_URI not set in .env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const CategoryModel = mongoose.model('Category', CategorySchema);
  const TagModel = mongoose.model('Tag', TagSchema);

  const categories = [
    { name: 'Note',        slug: 'note' },
    { name: 'Achievement', slug: 'achievement' },
    { name: 'Question',    slug: 'question' },
    { name: 'Tutorial',    slug: 'tutorial' },
  ];

  const tags = [
    { name: 'NestJS',      slug: 'nestjs' },
    { name: 'TypeScript',  slug: 'typescript' },
    { name: 'MongoDB',     slug: 'mongodb' },
    { name: 'Docker',      slug: 'docker' },
    { name: 'React',       slug: 'react' },
    { name: 'GraphQL',     slug: 'graphql' },
    { name: 'PostgreSQL',  slug: 'postgresql' },
    { name: 'AWS',         slug: 'aws' },
    { name: 'CI/CD',       slug: 'ci-cd' },
    { name: 'Testing',     slug: 'testing' },
  ];

  for (const cat of categories) {
    await CategoryModel.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: { ...cat, postCount: 0 } },
      { upsert: true },
    );
  }
  console.log(`Upserted ${categories.length} categories`);

  for (const tag of tags) {
    await TagModel.findOneAndUpdate(
      { slug: tag.slug },
      { $setOnInsert: { ...tag, postCount: 0 } },
      { upsert: true },
    );
  }
  console.log(`Upserted ${tags.length} tags`);

  console.log('\nDone. Existing users, posts, and friendships are unchanged.');
  await mongoose.disconnect();
}

seedFeed().catch(err => {
  console.error(err);
  process.exit(1);
});
