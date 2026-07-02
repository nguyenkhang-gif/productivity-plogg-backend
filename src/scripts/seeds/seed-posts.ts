/**
 * Inserts 10 000 posts with random authors, categories, tags, and content.
 * Does NOT touch users, existing posts, bookmarks, or friendships.
 *
 * Run: npm run seed:posts
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Hardcoded live IDs ───────────────────────────────────────────────────────

const USER_IDS = [
  '6a251e033de3f7478c136e20', // admin
  '6a251e033de3f7478c136e21', // alice
  '6a251e033de3f7478c136e22', // bob
  '6a251e033de3f7478c136e23', // carol
  '6a251e033de3f7478c136e24', // dan
  '6a251f16c093b0dd4d935ce0', // KNN448
];

const CATEGORY_IDS = [
  '6a251e033de3f7478c136e26', // note
  '6a251e033de3f7478c136e27', // achievement
  '6a251e033de3f7478c136e28', // question
  '6a251e033de3f7478c136e29', // tutorial
];

const TAG_IDS = [
  '6a251e033de3f7478c136e2b', // nestjs
  '6a251e033de3f7478c136e2c', // typescript
  '6a251e033de3f7478c136e2d', // mongodb
  '6a251e033de3f7478c136e2e', // docker
  '6a251e033de3f7478c136e2f', // react
  '6a251e033de3f7478c136e30', // graphql
  '6a251e033de3f7478c136e31', // postgresql
  '6a251e033de3f7478c136e32', // aws
  '6a251e033de3f7478c136e33', // ci-cd
  '6a251e033de3f7478c136e34', // testing
];

// ─── Content templates ────────────────────────────────────────────────────────

const OPENERS = [
  'Just spent the afternoon refactoring our',
  'Hot take:',
  'Spent 3 hours debugging only to find out',
  'Finally shipped',
  'Quick tip for anyone working with',
  'Does anyone else feel like',
  'After six months in production,',
  'TIL:',
  'Controversial opinion:',
  'We just migrated from',
  'Step-by-step walkthrough:',
  'Unpopular opinion —',
  'Something I wish I knew earlier about',
  'Just hit a weird edge case with',
  'The thing nobody tells you about',
  'Day 3 of learning',
  'Our team finally agreed on',
  "If you're not using",
  'Reminder that',
  'Real talk:',
  'Just published a write-up on',
  'The biggest mistake I see with',
  'We cut our build time in half by',
  'I benchmarked',
  'Stop writing',
  'PSA:',
  'Asked GPT to review my',
  'Shipped a small open-source tool for',
  'Interesting gotcha with',
  'Performance win of the week:',
];

const TOPICS = [
  'NestJS dependency injection',
  'TypeScript generics',
  'MongoDB aggregation pipelines',
  'Docker multi-stage builds',
  'React Server Components',
  'GraphQL subscriptions',
  'PostgreSQL indexes',
  'AWS Lambda cold starts',
  'CI/CD pipeline caching',
  'Jest unit tests',
  'Mongoose schema validation',
  'JWT refresh token rotation',
  'Redis caching strategies',
  'Kubernetes pod autoscaling',
  'Zod schema validation',
  'Prisma relations',
  'tRPC end-to-end types',
  'Tailwind responsive design',
  'Next.js App Router',
  'Vite build optimization',
  'pnpm workspace monorepos',
  'GitHub Actions matrix builds',
  'Sentry error tracking',
  'OpenTelemetry tracing',
  'Cloudflare Workers edge runtime',
];

const DETAILS = [
  'and it turned out to be a one-line fix.',
  "Highly recommend giving it a shot if you haven't already.",
  'The docs are surprisingly good once you find the right page.',
  'Still not sure if this is the intended behavior or a bug.',
  'Would love to hear how others have handled this.',
  'This saved us about 40 % in cold-start latency.',
  'Turns out the default config is almost never what you want.',
  'The community Discord was incredibly helpful here.',
  'Three PRs later and it finally works the way I expected.',
  'Went from 8 minutes to under 90 seconds.',
  "If you're hitting the same issue, check the GitHub issues — there's a workaround.",
  'Lesson learned: always read the migration guide.',
  'The mental model shift takes a day, then it clicks.',
  "We're now handling 3× the traffic with the same infra.",
  'Opened a PR upstream — will report back.',
  'Would not use in production until the API stabilizes.',
  'The escape hatches are there if you need them.',
  'Pairs really well with Zod for runtime validation.',
  'Worth the refactor — code is noticeably cleaner.',
  'Ask me anything in the comments.',
  'Link to the full write-up in my profile.',
  'Happy to share the config if anyone wants it.',
  'YMMV depending on your infra setup.',
  'Probably obvious in hindsight, but it tripped us up.',
  'This pattern has been in our codebase for 6 months now, no regrets.',
];

const CONNECTORS = [
  ' — ',
  '. ',
  ', and ',
  '. Turns out ',
  '. The key insight: ',
  '. ',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateContent(): string {
  const sentenceCount = randomInt(2, 4);
  const sentences: string[] = [];

  for (let i = 0; i < sentenceCount; i++) {
    const opener = pick(OPENERS);
    const topic = pick(TOPICS);
    const connector = pick(CONNECTORS);
    const detail = pick(DETAILS);
    sentences.push(`${opener} ${topic}${connector}${detail}`);
  }

  return sentences.join(' ');
}

function buildPost() {
  const tagCount = randomInt(0, 3);
  const noCategory = Math.random() < 0.1;

  return {
    authorId: pick(USER_IDS),
    content: generateContent(),
    imageUrls: [],
    isPublished: Math.random() < 0.95,
    categoryId: noCategory ? null : pick(CATEGORY_IDS),
    tagIds: tagCount > 0 ? pickN(TAG_IDS, tagCount) : [],
    viewCount: randomInt(0, 500),
  };
}

// ─── Schema (minimal) ─────────────────────────────────────────────────────────

const PostSchema = new mongoose.Schema(
  {
    authorId: String,
    content: String,
    imageUrls: [String],
    isPublished: Boolean,
    categoryId: String,
    tagIds: [String],
    viewCount: Number,
  },
  { timestamps: true },
);

const CategorySchema = new mongoose.Schema(
  { postCount: Number },
  { strict: false },
);
const TagSchema = new mongoose.Schema({ postCount: Number }, { strict: false });

// ─── Main ─────────────────────────────────────────────────────────────────────

const TOTAL = 10_000;
const BATCH = 500;

async function seedPosts() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('MONGO_DB_URI not set in .env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const PostModel = mongoose.model('Post', PostSchema);
  const CategoryModel = mongoose.model('Category', CategorySchema);
  const TagModel = mongoose.model('Tag', TagSchema);

  const batches = Math.ceil(TOTAL / BATCH);
  let inserted = 0;

  for (let b = 0; b < batches; b++) {
    const size = Math.min(BATCH, TOTAL - inserted);
    const docs = Array.from({ length: size }, buildPost);
    await PostModel.insertMany(docs, { ordered: false });
    inserted += size;
    console.log(
      `  Batch ${b + 1}/${batches} — ${inserted}/${TOTAL} posts inserted`,
    );
  }

  console.log('\nRecalculating postCounts...');

  await Promise.all([
    ...CATEGORY_IDS.map((id) =>
      PostModel.countDocuments({ categoryId: id, isPublished: true }).then(
        (count) => CategoryModel.findByIdAndUpdate(id, { postCount: count }),
      ),
    ),
    ...TAG_IDS.map((id) =>
      PostModel.countDocuments({ tagIds: id, isPublished: true }).then(
        (count) => TagModel.findByIdAndUpdate(id, { postCount: count }),
      ),
    ),
  ]);

  const total = await PostModel.countDocuments();
  console.log(`\n=== Done. Total posts in DB: ${total} ===`);

  await mongoose.disconnect();
}

seedPosts().catch((err) => {
  console.error(err);
  process.exit(1);
});
