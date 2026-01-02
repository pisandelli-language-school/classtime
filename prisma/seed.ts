import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ROOT_USER_EMAIL;

  if (!email) {
    throw new Error(
      'ROOT_USER_EMAIL environment variable is required for seeding.'
    );
  }

  console.log(`Checking for ROOT user with email: ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('SEED ERROR:', e);
    if (e instanceof Error) {
      console.error('Message:', e.message);
      // @ts-ignore
      if (e.cause) console.error('Cause:', e.cause);
    }
    await prisma.$disconnect();
    process.exit(1);
  });
