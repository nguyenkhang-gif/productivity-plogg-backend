process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { PrismaClient, BudgetTransactionType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const SYSTEM_USER_ID = 'system';

const expenseCategories = [
  { name: 'Ăn uống', icon: '🍔', color: '#f97316' },
  { name: 'Di chuyển', icon: '🚗', color: '#3b82f6' },
  { name: 'Mua sắm', icon: '🛍️', color: '#ec4899' },
  { name: 'Nhà ở', icon: '🏠', color: '#8b5cf6' },
  { name: 'Sức khỏe', icon: '💊', color: '#ef4444' },
  { name: 'Giải trí', icon: '🎮', color: '#06b6d4' },
  { name: 'Giáo dục', icon: '📚', color: '#10b981' },
  { name: 'Du lịch', icon: '✈️', color: '#f59e0b' },
  { name: 'Điện nước', icon: '💡', color: '#84cc16' },
  { name: 'Khác', icon: '📦', color: '#6b7280' },
];

const incomeCategories = [
  { name: 'Lương', icon: '💼', color: '#10b981' },
  { name: 'Freelance', icon: '💻', color: '#3b82f6' },
  { name: 'Đầu tư', icon: '📈', color: '#f59e0b' },
  { name: 'Quà tặng', icon: '🎁', color: '#ec4899' },
  { name: 'Khác', icon: '💰', color: '#6b7280' },
];

async function main() {
  console.log('Seeding budget categories...');

  for (const cat of expenseCategories) {
    await prisma.budgetCategory.upsert({
      where: {
        userId_name_type: {
          userId: SYSTEM_USER_ID,
          name: cat.name,
          type: BudgetTransactionType.EXPENSE,
        },
      },
      update: { icon: cat.icon, color: cat.color },
      create: {
        userId: SYSTEM_USER_ID,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: BudgetTransactionType.EXPENSE,
      },
    });
  }

  for (const cat of incomeCategories) {
    await prisma.budgetCategory.upsert({
      where: {
        userId_name_type: {
          userId: SYSTEM_USER_ID,
          name: cat.name,
          type: BudgetTransactionType.INCOME,
        },
      },
      update: { icon: cat.icon, color: cat.color },
      create: {
        userId: SYSTEM_USER_ID,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: BudgetTransactionType.INCOME,
      },
    });
  }

  console.log(`Seeded ${expenseCategories.length} expense + ${incomeCategories.length} income categories.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
