/**
 * Run: npx ts-node -r tsconfig-paths/register src/database/seeds/seed.ts
 *
 * Drops and re-creates: users, categories, tags, posts, bookmarks, friendships
 * All other collections are left untouched.
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Schemas (inline — no NestJS DI needed) ──────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    fullName: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    passwordHash: String,
    gender: { type: String, default: 'other' },
    profilePic: String,
    membership: { type: String, default: 'basic' },
    role: { type: String, default: 'user' },
    isPrivate: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true },
);

const CategorySchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const TagSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const PostSchema = new mongoose.Schema(
  {
    authorId: String,
    content: String,
    imageUrls: { type: [String], default: [] },
    isPublished: { type: Boolean, default: true },
    categoryId: { type: String, default: null },
    tagIds: { type: [String], default: [] },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const BookmarkSchema = new mongoose.Schema(
  {
    userId: String,
    postId: String,
  },
  { timestamps: true },
);

const FriendshipSchema = new mongoose.Schema(
  {
    userId: String,
    friendId: String,
    status: { type: String, default: 'accepted' },
  },
  { timestamps: true },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function id(doc: any): string {
  return doc._id.toString();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('MONGO_DB_URI not set in .env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const UserModel = mongoose.model('User', UserSchema);
  const CategoryModel = mongoose.model('Category', CategorySchema);
  const TagModel = mongoose.model('Tag', TagSchema);
  const PostModel = mongoose.model('Post', PostSchema);
  const BookmarkModel = mongoose.model('Bookmark', BookmarkSchema);
  const FriendshipModel = mongoose.model('Friendship', FriendshipSchema);

  // ── Wipe ──────────────────────────────────────────────────────────────────
  await Promise.all([
    UserModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    TagModel.deleteMany({}),
    PostModel.deleteMany({}),
    BookmarkModel.deleteMany({}),
    FriendshipModel.deleteMany({}),
  ]);
  console.log('Cleared old seed data');

  // ── Users ─────────────────────────────────────────────────────────────────
  const SALT = 10;
  const users = await UserModel.insertMany([
    {
      fullName: 'Admin User',
      username: 'admin',
      email: 'admin@test.com',
      passwordHash: await bcrypt.hash('Admin123!', SALT),
      role: 'admin',
    },
    {
      fullName: 'Alice Dev',
      username: 'alice',
      email: 'alice@test.com',
      passwordHash: await bcrypt.hash('Alice123!', SALT),
      role: 'user',
    },
    {
      fullName: 'Bob Builder',
      username: 'bob',
      email: 'bob@test.com',
      passwordHash: await bcrypt.hash('Bob123!', SALT),
      role: 'user',
    },
    {
      fullName: 'Carol Coder',
      username: 'carol',
      email: 'carol@test.com',
      passwordHash: await bcrypt.hash('Carol123!', SALT),
      role: 'user',
    },
    {
      fullName: 'Dan Designer',
      username: 'dan',
      email: 'dan@test.com',
      passwordHash: await bcrypt.hash('Dan1234!', SALT),
      role: 'user',
      isPrivate: true,
    },
  ]);
  const [admin, alice, bob, carol] = users;
  console.log(`Seeded ${users.length} users`);

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = await CategoryModel.insertMany([
    { name: 'Note', slug: 'note' },
    { name: 'Achievement', slug: 'achievement' },
    { name: 'Question', slug: 'question' },
    { name: 'Tutorial', slug: 'tutorial' },
  ]);
  const [catNote, catAchievement, catQuestion, catTutorial] = categories;
  console.log(`Seeded ${categories.length} categories`);

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tags = await TagModel.insertMany([
    { name: 'NestJS', slug: 'nestjs' },
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'MongoDB', slug: 'mongodb' },
    { name: 'Docker', slug: 'docker' },
    { name: 'React', slug: 'react' },
    { name: 'GraphQL', slug: 'graphql' },
    { name: 'PostgreSQL', slug: 'postgresql' },
    { name: 'AWS', slug: 'aws' },
    { name: 'CI/CD', slug: 'ci-cd' },
    { name: 'Testing', slug: 'testing' },
  ]);
  const tagMap = Object.fromEntries(tags.map(t => [t.slug, id(t)]));
  console.log(`Seeded ${tags.length} tags`);

  // ── Posts ─────────────────────────────────────────────────────────────────
  const postDefs = [
    {
      authorId: id(alice),
      content: 'Just deployed my first NestJS app to AWS using clean architecture. The separation of concerns made the deploy painless — use-cases don\'t know about infrastructure at all.',
      categoryId: id(catAchievement),
      tagIds: [tagMap['nestjs'], tagMap['aws']],
      viewCount: 120,
      isPublished: true,
    },
    {
      authorId: id(alice),
      content: 'How do you handle refresh token rotation in NestJS with JWT? I\'m storing the refresh token hash in MongoDB and invalidating on reuse. Looking for best practices or pitfalls.',
      categoryId: id(catQuestion),
      tagIds: [tagMap['nestjs'], tagMap['typescript']],
      viewCount: 85,
      isPublished: true,
    },
    {
      authorId: id(alice),
      content: 'TIL: TypeScript\'s `satisfies` operator lets you validate a value against a type without widening — great for config objects where you want both type-safety and literal inference.',
      categoryId: id(catNote),
      tagIds: [tagMap['typescript']],
      viewCount: 55,
      isPublished: true,
    },
    {
      authorId: id(bob),
      content: 'Quick note: MongoDB $lookup with an array localField does an implicit $in — no $unwind needed. Saved me 2 pipeline stages today.',
      categoryId: id(catNote),
      tagIds: [tagMap['mongodb']],
      viewCount: 60,
      isPublished: true,
    },
    {
      authorId: id(bob),
      content: `Step-by-step: Dockerize a NestJS + MongoDB app with multi-stage builds.

1. Builder stage: \`node:20-alpine\` + \`npm ci\` + \`nest build\`
2. Runner stage: copy \`dist/\` and \`node_modules/\`
3. Final image is ~180 MB vs ~900 MB naive

Full Dockerfile in comments.`,
      categoryId: id(catTutorial),
      tagIds: [tagMap['nestjs'], tagMap['docker'], tagMap['mongodb']],
      viewCount: 200,
      isPublished: true,
    },
    {
      authorId: id(bob),
      content: 'Finally got our CI pipeline under 4 minutes. Key: cache node_modules between runs keyed on package-lock.json hash. GitHub Actions matrix for Node 18/20 in parallel.',
      categoryId: id(catAchievement),
      tagIds: [tagMap['ci-cd'], tagMap['testing']],
      viewCount: 95,
      isPublished: true,
    },
    {
      authorId: id(carol),
      content: 'GraphQL subscriptions with NestJS — anyone running this at scale? Wondering whether to use Redis PubSub or just Socket.IO events. The Apollo WS transport keeps dropping on Heroku.',
      categoryId: id(catQuestion),
      tagIds: [tagMap['graphql'], tagMap['nestjs']],
      viewCount: 70,
      isPublished: true,
    },
    {
      authorId: id(carol),
      content: 'PostgreSQL vs MongoDB for a social feed — my take after running both in prod: PG wins for complex queries and ACID, Mongo wins for schema flexibility and horizontal writes. For most apps at <10M records: pick the one your team knows.',
      categoryId: id(catNote),
      tagIds: [tagMap['postgresql'], tagMap['mongodb']],
      viewCount: 140,
      isPublished: true,
    },
    {
      authorId: id(carol),
      content: 'React Server Components changed how I think about data fetching. No more prop-drilling token through every layer — just fetch on the server and stream the result.',
      categoryId: id(catNote),
      tagIds: [tagMap['react'], tagMap['typescript']],
      viewCount: 110,
      isPublished: true,
    },
    {
      authorId: id(alice),
      content: 'Draft tutorial on AWS Lambda cold starts — still researching. Don\'t publish yet.',
      categoryId: id(catTutorial),
      tagIds: [tagMap['aws']],
      viewCount: 0,
      isPublished: false,
    },
  ];

  const posts = await PostModel.insertMany(postDefs);
  console.log(`Seeded ${posts.length} posts`);

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  const dockerPost = posts.find(p => p.tagIds.includes(tagMap['docker']));
  const graphqlPost = posts.find(p => p.tagIds.includes(tagMap['graphql']));
  const aliceAchievement = posts.find(
    p => p.authorId === id(alice) && p.categoryId === id(catAchievement),
  );

  const bookmarks = await BookmarkModel.insertMany([
    { userId: id(alice), postId: id(dockerPost) },
    { userId: id(alice), postId: id(graphqlPost) },
    { userId: id(bob), postId: id(aliceAchievement) },
    { userId: id(carol), postId: id(dockerPost) },
  ]);
  console.log(`Seeded ${bookmarks.length} bookmarks`);

  // ── Friendships ───────────────────────────────────────────────────────────
  await FriendshipModel.insertMany([
    { userId: id(alice), friendId: id(bob), status: 'accepted' },
    { userId: id(alice), friendId: id(carol), status: 'accepted' },
    { userId: id(bob), friendId: id(carol), status: 'accepted' },
    { userId: id(alice), friendId: id(admin), status: 'pending' },
  ]);
  console.log('Seeded friendships');

  // ── Recalculate postCounts ────────────────────────────────────────────────
  for (const cat of categories) {
    const count = await PostModel.countDocuments({ categoryId: id(cat), isPublished: true });
    await CategoryModel.findByIdAndUpdate(cat._id, { postCount: count });
  }

  for (const tag of tags) {
    const count = await PostModel.countDocuments({ tagIds: id(tag), isPublished: true });
    await TagModel.findByIdAndUpdate(tag._id, { postCount: count });
  }
  console.log('Recalculated postCounts');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n=== Seed complete ===');
  console.log('Logins:');
  console.log('  admin@test.com  / Admin123!  (role: admin)');
  console.log('  alice@test.com  / Alice123!');
  console.log('  bob@test.com    / Bob123!');
  console.log('  carol@test.com  / Carol123!');
  console.log('  dan@test.com    / Dan1234!   (private account)');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
