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

  // Ensure ROOT user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        role: Role.ROOT,
        hourlyRate: 50.0,
        active: true,
      },
    });
    console.log(`ROOT user created: ${email}`);
  } else {
    console.log('ROOT user exists.');
  }

  // Ensure mock classes
  const physicsClass = await prisma.class.upsert({
    where: { id: 'mock-class-physics' }, // Using fixed IDs for idempotency
    update: {},
    create: { id: 'mock-class-physics', name: 'Physics 101' },
  });

  const mathClass = await prisma.class.upsert({
    where: { id: 'mock-class-math' },
    update: {},
    create: { id: 'mock-class-math', name: 'Math 202' },
  });

  // Ensure mock students
  const studentAlice = await prisma.student.upsert({
    where: { id: 'mock-student-alice' },
    update: {},
    create: { id: 'mock-student-alice', name: 'Alice Smith' },
  });

  const studentBob = await prisma.student.upsert({
    where: { id: 'mock-student-bob' },
    update: {},
    create: { id: 'mock-student-bob', name: 'Bob Jones' },
  });

  // Ensure assignments for the user
  await prisma.assignment.upsert({
    where: { id: 'assign_root_physics_alice' },
    update: {
      teacherId: user.id, // Ensure teacher is updated if assignment exists
    },
    create: {
      id: 'assign_root_physics_alice',
      teacherId: user.id,
      classId: physicsClass.id,
      studentId: studentAlice.id,
    },
  });

  await prisma.assignment.upsert({
    where: { id: 'assign_root_math_bob' },
    update: {
      teacherId: user.id, // Ensure teacher is updated if assignment exists
    },
    create: {
      id: 'assign_root_math_bob',
      teacherId: user.id,
      classId: mathClass.id,
      studentId: studentBob.id,
    },
  });

  console.log('Assignments created/verified.');

  // Create a draft timesheet for current month if not exists
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await prisma.timesheetPeriod.upsert({
    where: {
      userId_month_year: {
        userId: user.id,
        month,
        year,
      },
    },
    update: {},
    create: {
      userId: user.id,
      month,
      year,
      status: 'DRAFT',
    },
  });

  console.log(`Timesheet for ${month}/${year} ensured.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
