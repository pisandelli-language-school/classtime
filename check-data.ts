import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ROOT_USER_EMAIL;
  if (!email) {
    throw new Error('ROOT_USER_EMAIL environment variable is required.');
  }
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      assignments: {
        include: {
          class: true,
          student: true,
        },
      },
    },
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log(`User: ${user.email} (Role: ${user.role})`);
  console.log(`Assignments count: ${user.assignments.length}`);
  user.assignments.forEach((a) => {
    console.log(` - ${a.class?.name} with ${a.student?.name}`);
  });
}

main();
