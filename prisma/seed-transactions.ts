process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { PrismaClient, BudgetTransactionType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import mongoose from 'mongoose';
import 'dotenv/config';

// ── Prisma (PostgreSQL) ───────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const expenseAmountRanges: Record<string, [number, number]> = {
  'Ăn uống':   [20_000,  200_000],
  'Di chuyển': [15_000,  150_000],
  'Mua sắm':   [50_000,  500_000],
  'Nhà ở':     [500_000, 3_000_000],
  'Sức khỏe':  [30_000,  300_000],
  'Giải trí':  [30_000,  200_000],
  'Giáo dục':  [100_000, 1_000_000],
  'Du lịch':   [200_000, 2_000_000],
  'Điện nước': [100_000, 500_000],
  'Khác':      [10_000,  200_000],
};

const incomeAmountRanges: Record<string, [number, number]> = {
  'Lương':     [5_000_000, 20_000_000],
  'Freelance': [500_000,   5_000_000],
  'Đầu tư':   [100_000,   2_000_000],
  'Quà tặng': [50_000,    500_000],
  'Khác':     [50_000,    500_000],
};

const expenseNotes: Record<string, string[]> = {
  'Ăn uống':   ['Bữa trưa', 'Cà phê sáng', 'Bữa tối với gia đình', 'Trà sữa', 'Đặt đồ ăn online'],
  'Di chuyển': ['Grab đi làm', 'Xăng xe', 'Vé xe buýt', 'Taxi sân bay', 'Parking'],
  'Mua sắm':   ['Quần áo mới', 'Đồ gia dụng', 'Shopee', 'Siêu thị', 'Mỹ phẩm'],
  'Nhà ở':     ['Tiền thuê nhà', 'Sửa chữa nhà', 'Nội thất', 'Vệ sinh nhà'],
  'Sức khỏe':  ['Khám bệnh', 'Mua thuốc', 'Gym tháng này', 'Vitamin', 'Nha khoa'],
  'Giải trí':  ['Netflix', 'Cinema', 'Game', 'Spotify', 'Karaoke'],
  'Giáo dục':  ['Khóa học online', 'Sách giáo khoa', 'Tiếng Anh', 'Học phí'],
  'Du lịch':   ['Vé máy bay', 'Khách sạn', 'Tour du lịch', 'Ăn uống du lịch'],
  'Điện nước': ['Hóa đơn điện', 'Hóa đơn nước', 'Internet', 'Điện thoại'],
  'Khác':      ['Chi tiêu khác', 'Quà sinh nhật', 'Từ thiện', 'Phí dịch vụ'],
};

const incomeNotes: Record<string, string[]> = {
  'Lương':     ['Lương tháng này', 'Lương + thưởng', 'Lương thực nhận'],
  'Freelance': ['Dự án website', 'Thiết kế logo', 'Viết content', 'Fix bug'],
  'Đầu tư':   ['Lãi cổ phiếu', 'Tiền gửi ngân hàng', 'Crypto profit'],
  'Quà tặng': ['Quà sinh nhật', 'Lì xì', 'Quà từ gia đình'],
  'Khác':     ['Thu nhập khác', 'Bán đồ cũ', 'Hoàn tiền'],
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Validate env
  if (!process.env.MONGO_DB_URI) throw new Error('Missing MONGO_DB_URI in .env');
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL in .env');

  // 2. Fetch user IDs from MongoDB
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_DB_URI!);
  const users = await mongoose.connection.db!
    .collection('users')
    .find({}, { projection: { _id: 1, username: 1 } })
    .toArray();
  await mongoose.disconnect();

  if (users.length === 0) throw new Error('No users found in MongoDB. Cannot seed transactions.');
  console.log(`Found ${users.length} user(s): ${users.map((u) => u.username).join(', ')}`);

  // 3. Fetch system categories from PostgreSQL
  const categories = await prisma.budgetCategory.findMany({
    where: { userId: 'system', isArchived: false },
  });
  if (categories.length === 0) throw new Error('No system categories found. Run `npm run seed:budget` first.');

  const expenseCats = categories.filter((c) => c.type === BudgetTransactionType.EXPENSE);
  const incomeCats  = categories.filter((c) => c.type === BudgetTransactionType.INCOME);
  console.log(`Found ${expenseCats.length} expense + ${incomeCats.length} income categories.`);

  // 4. Seed transactions — last 6 months
  const now   = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  let totalCreated = 0;

  for (const user of users) {
    const userId = user._id.toString();
    console.log(`\nSeeding transactions for user: ${user.username} (${userId})`);

    const transactions: any[] = [];

    // ~3–5 income per month × 6 months
    for (let m = 0; m < 6; m++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
      const incomeCount = rand(3, 5);

      for (let i = 0; i < incomeCount; i++) {
        const cat   = pick(incomeCats);
        const range = incomeAmountRanges[cat.name] ?? [500_000, 5_000_000];
        const notes = incomeNotes[cat.name] ?? ['Thu nhập'];
        transactions.push({
          userId,
          categoryId: cat.id,
          type: BudgetTransactionType.INCOME,
          amount: rand(range[0], range[1]),
          currency: 'VND',
          amountInBaseCurrency: rand(range[0], range[1]),
          exchangeRateUsed: 1,
          date: randomDate(monthStart, monthEnd),
          note: pick(notes),
          isRecurring: false,
          isDeleted: false,
        });
      }

      // ~10–20 expenses per month
      const expenseCount = rand(10, 20);
      for (let i = 0; i < expenseCount; i++) {
        const cat   = pick(expenseCats);
        const range = expenseAmountRanges[cat.name] ?? [10_000, 200_000];
        const notes = expenseNotes[cat.name] ?? ['Chi tiêu'];
        const amount = rand(range[0], range[1]);
        transactions.push({
          userId,
          categoryId: cat.id,
          type: BudgetTransactionType.EXPENSE,
          amount,
          currency: 'VND',
          amountInBaseCurrency: amount,
          exchangeRateUsed: 1,
          date: randomDate(monthStart, monthEnd),
          note: pick(notes),
          isRecurring: false,
          isDeleted: false,
        });
      }
    }

    // batch insert
    const result = await prisma.budgetTransaction.createMany({ data: transactions });
    totalCreated += result.count;
    console.log(`  → Created ${result.count} transactions`);
  }

  console.log(`\nDone! Total transactions created: ${totalCreated}`);
}

main()
  .catch((e) => { console.error('\nSeed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
