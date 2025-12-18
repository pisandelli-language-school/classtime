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

  const timesheet = await prisma.timesheetPeriod.upsert({
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

  // Create mock entries for the CURRENT WEEK so they show up in UI
  const today = new Date();
  const currentDay = today.getDay(); // Sunday - Saturday : 0 - 6
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(today.setDate(diff));
  monday.setHours(9, 0, 0, 0); // 9 AM

  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);

  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);

  // Mock Entry 1: Monday - Physics - Alice
  await prisma.timeEntry.upsert({
    where: {
      timesheetPeriodId_date_assignmentId: {
        timesheetPeriodId: timesheet.id,
        date: monday,
        assignmentId: 'assign_root_physics_alice',
      },
    },
    update: {},
    create: {
      timesheetPeriodId: timesheet.id,
      date: monday,
      assignmentId: 'assign_root_physics_alice',
      duration: 1.5,
      type: 'Normal',
      description: 'Lab Session 1: Basics',
    },
  });

  // Mock Entry 2: Tuesday - Math - Bob
  await prisma.timeEntry.upsert({
    where: {
      timesheetPeriodId_date_assignmentId: {
        timesheetPeriodId: timesheet.id,
        date: tuesday,
        assignmentId: 'assign_root_math_bob',
      },
    },
    update: {},
    create: {
      timesheetPeriodId: timesheet.id,
      date: tuesday,
      assignmentId: 'assign_root_math_bob',
      duration: 2.0,
      type: 'Normal',
      description: 'Calculus Review',
    },
  });

  console.log('Mock TimeEntries created for current week.');
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
