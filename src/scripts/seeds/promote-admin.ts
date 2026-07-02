/**
 * Promote an existing user to `admin` (non-destructive — touches only that one user).
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/promote-admin.ts user@example.com
 *   # or via env:
 *   ADMIN_EMAIL=user@example.com npm run seed:admin
 *
 * Pass `--role moderator` to grant moderator instead of admin.
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true },
    username: String,
    role: { type: String, default: 'user' },
  },
  { timestamps: true, strict: false },
);

function parseArgs(): { email?: string; role: string } {
  const args = process.argv.slice(2);
  let role = 'admin';
  let email = process.env.ADMIN_EMAIL;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--role') {
      role = args[++i];
    } else if (!args[i].startsWith('--')) {
      email = args[i];
    }
  }
  return { email, role };
}

async function run() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('MONGO_DB_URI not set in .env');

  const { email, role } = parseArgs();
  if (!email) {
    throw new Error(
      'No email provided. Usage: promote-admin.ts <email> [--role admin|moderator]',
    );
  }
  if (!['admin', 'moderator', 'user'].includes(role)) {
    throw new Error(
      `Invalid role "${role}". Must be admin, moderator, or user.`,
    );
  }

  await mongoose.connect(uri);
  const UserModel = mongoose.model('User', UserSchema);

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new Error(
      `No user found with email "${email}". Register that account first.`,
    );
  }

  const prev = (user as any).role ?? 'user';
  (user as any).role = role;
  await user.save();

  console.log(`✓ ${email} (${(user as any).username}) role: ${prev} → ${role}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
