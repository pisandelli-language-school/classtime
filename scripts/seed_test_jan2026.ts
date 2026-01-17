import { PrismaClient, ContractStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const STUDENT_NAMES = [
  'Alice',
  'Bob',
  'Charlie',
  'David',
  'Eva',
  'Fiona',
  'George',
  'Hannah',
  'Ian',
  'Julia',
  'Kevin',
  'Luna',
  'Mike',
  'Nina',
  'Oliver',
  'Paula',
  'Quinn',
  'Rachel',
  'Steve',
  'Tina',
  'Uma',
  'Victor',
  'Wendy',
  'Xander',
  'Yara',
  'Zack',
];

const CLASS_SUBJECTS = [
  'Business English',
  'Conversation',
  'Grammar Focus',
  'IELTS Prep',
  'Beginner A1',
  'Advanced C1',
];
const TEACHER_NAMES = [
  'Teacher Sarah',
  'Teacher Mike',
  'Teacher John',
  'Teacher Emma',
  'Teacher Lucas',
  'Teacher Ana',
  'Teacher Pedro',
  'Teacher Julia',
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Starting Phase 1 Seed: Contracts & Assignments...');

  // 1. Ensure Teachers
  let teachers = await prisma.user.findMany({
    where: { role: 'TEACHER', active: true },
  });

  if (teachers.length < 5) {
    console.log('Creating more teachers...');
    for (const name of TEACHER_NAMES) {
      if (teachers.length >= 8) break;
      const exists = await prisma.user.findFirst({ where: { name } });
      if (!exists) {
        const t = await prisma.user.create({
          data: {
            name,
            email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
            role: 'TEACHER',
            hourlyRate: 50 + Math.floor(Math.random() * 50),
            active: true,
          },
        });
        teachers.push(t);
      }
    }
    teachers = await prisma.user.findMany({
      where: { role: 'TEACHER', active: true },
    });
  }

  console.log(`ℹ️  Current Teacher Count: ${teachers.length}`);

  // 2. Loop Teachers and Ensure Contracts
  let totalContracts = 0;

  for (const teacher of teachers) {
    // Check existing assignments/contracts
    const existingAssignments = await prisma.assignment.findMany({
      where: { teacherId: teacher.id },
    });

    const needed = 3 - existingAssignments.length;

    if (needed <= 0) {
      totalContracts += existingAssignments.length;
      continue;
    }

    console.log(`   - Creating ${needed} contracts for ${teacher.name}`);

    for (let i = 0; i < needed; i++) {
      const isClass = Math.random() > 0.5; // 50/50 split

      if (isClass) {
        // --- CLASS CONTRACT ---
        const className = `${getRandomItem(CLASS_SUBJECTS)} - Group ${Math.floor(Math.random() * 100)}`;

        // Create Class
        const cls = await prisma.class.create({
          data: {
            name: className,
            startDate: new Date(2025, 0, 1),
          },
        });

        // Enroll 3-5 Students
        const studentCount = 3 + Math.floor(Math.random() * 3);
        const students = [];
        for (let j = 0; j < studentCount; j++) {
          const s = await prisma.student.create({
            data: { name: `${getRandomItem(STUDENT_NAMES)} (Student)` },
          });
          // Link to Class (Prisma implicit M-N)
          await prisma.class.update({
            where: { id: cls.id },
            data: { students: { connect: { id: s.id } } },
          });
          students.push(s);
        }

        // Create Assignment
        const assignment = await prisma.assignment.create({
          data: {
            teacherId: teacher.id,
            classId: cls.id,
          },
        });

        // Create Contract
        await prisma.contract.create({
          data: {
            classId: cls.id,
            totalHours: 40,
            weeklyHours: 4,
            startDate: new Date(2026, 0, 1),
            status: ContractStatus.ACTIVE,
          },
        });

        console.log(
          `     + Created Class: ${className} with ${students.length} students`,
        );
      } else {
        // --- VIP CONTRACT ---
        const studentName = `${getRandomItem(STUDENT_NAMES)} (VIP)`;
        const student = await prisma.student.create({
          data: { name: studentName },
        });

        // Create Assignment
        const assignment = await prisma.assignment.create({
          data: {
            teacherId: teacher.id,
            studentId: student.id,
          },
        });

        // Create Contract
        await prisma.contract.create({
          data: {
            studentId: student.id,
            totalHours: 20,
            weeklyHours: 2,
            startDate: new Date(2026, 0, 1),
            status: ContractStatus.ACTIVE,
          },
        });

        console.log(`     + Created VIP: ${studentName}`);
      }
    }
    totalContracts += 3; // approx
  }

  console.log(
    `\n✅ Phase 1 Complete. Approx Total Contracts: ${totalContracts}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
