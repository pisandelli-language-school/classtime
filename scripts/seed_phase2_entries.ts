import { PrismaClient, TimesheetStatus, WeeklyStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  startOfWeek,
  endOfWeek,
  addDays,
  getWeek,
  format,
  getYear,
} from 'date-fns';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YEAR = 2026;
const MONTH = 1; // January

// Helper to get week number compatible with logic
function getWeekNumber(d: Date) {
  // Basic wrapper, assuming App uses ISO
  return getWeek(d, { weekStartsOn: 1 });
}

async function main() {
  console.log('🌱 Starting Phase 2 Seed: Time Entries for January 2026...');

  // 1. Get Teachers
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER', active: true },
    include: {
      assignments: {
        include: {
          student: true,
          class: true,
        },
      },
    },
  });

  console.log(`Processing ${teachers.length} teachers...`);

  // Define Jan 2026 Structure
  // Week 1: Dec 29 - Jan 4 (Week 1 of 2026 technically or 53 of 2025 depending on system. Let's use ISO week)
  // Let's rely on specific dates in Jan to determine the "week" object.

  // Scenarios for testing Invoicing:
  // Week 1 (Jan 1-4): APPROVED
  // Week 2 (Jan 5-11): APPROVED
  // Week 3 (Jan 12-18): SUBMITTED (Needs Approval)
  // Week 4 (Jan 19-25): DRAFT (Pending Submit)
  // Week 5 (Jan 26-31): REJECTED (Needs Fix)

  const scenarios = [
    { date: new Date(2026, 0, 2, 10, 0), status: WeeklyStatus.APPROVED }, // Fri Jan 2
    { date: new Date(2026, 0, 6, 14, 0), status: WeeklyStatus.APPROVED }, // Tue Jan 6
    { date: new Date(2026, 0, 13, 9, 0), status: WeeklyStatus.SUBMITTED }, // Tue Jan 13
    { date: new Date(2026, 0, 20, 16, 0), status: WeeklyStatus.PENDING }, // Tue Jan 20
    { date: new Date(2026, 0, 27, 11, 0), status: WeeklyStatus.REJECTED }, // Tue Jan 27
  ];

  for (const teacher of teachers) {
    if (teacher.assignments.length === 0) {
      console.log(`⚠️  Skipping ${teacher.name} (No Assignments)`);
      continue;
    }

    console.log(
      `   - Processing ${teacher.name} (${teacher.assignments.length} assignments)`,
    );

    // Ensure TimesheetPeriod exists
    const period = await prisma.timesheetPeriod.upsert({
      where: {
        userId_month_year: { userId: teacher.id, month: MONTH, year: YEAR },
      },
      update: {},
      create: {
        userId: teacher.id,
        month: MONTH,
        year: YEAR,
        status: TimesheetStatus.DRAFT,
      },
    });

    // For each scenario week
    for (const scenario of scenarios) {
      const weekNum = getWeekNumber(scenario.date);

      // Add 1-2 entries per week (using random assignments)
      const entriesCount = 1 + Math.floor(Math.random() * 2);

      let totalHours = 0;

      for (let i = 0; i < entriesCount; i++) {
        const assignment =
          teacher.assignments[
            Math.floor(Math.random() * teacher.assignments.length)
          ];
        const duration = [1, 1.5, 2][Math.floor(Math.random() * 3)];

        const description = assignment.class
          ? `Aula: ${assignment.class.name}`
          : `Aula VIP: ${assignment.student?.name}`;

        // Offset date slightly so not all same time
        const entryDate = addDays(scenario.date, i);

        await prisma.timeEntry.create({
          data: {
            timesheetPeriodId: period.id,
            date: entryDate,
            duration: duration,
            description: description,
            assignmentId: assignment.id,
            type: 'Normal',
          },
        });
        totalHours += duration;
      }

      // Update Weekly Status
      await prisma.weeklyTimesheetStatus.upsert({
        where: {
          userId_year_week: {
            userId: teacher.id,
            year: YEAR,
            week: weekNum,
          },
        },
        update: {
          status: scenario.status,
          rejectionReason:
            scenario.status === 'REJECTED' ? 'Descrição incompleta' : null,
        },
        create: {
          userId: teacher.id,
          year: YEAR,
          week: weekNum,
          status: scenario.status,
          rejectionReason:
            scenario.status === 'REJECTED' ? 'Descrição incompleta' : null,
        },
      });

      console.log(
        `     + Week ${weekNum}: ${scenario.status} (${totalHours}h)`,
      );
    }
  }

  console.log('\n✅ Phase 2 Seed Completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
