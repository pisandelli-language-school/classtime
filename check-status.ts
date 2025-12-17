import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const allTimesheets = await prisma.timesheetPeriod.findMany({
    include: { user: true },
  });
  console.log('All Timesheets:', JSON.stringify(allTimesheets, null, 2));

  const submissions = await prisma.timesheetPeriod.count({
    where: { status: 'SUBMITTED' },
  });
  console.log('Count SUBMITTED:', submissions);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
