import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const dbUser = await safeQuery(() =>
    prisma.user.findUnique({
      where: { email: user.email },
    })
  );

  if (!dbUser) {
    throw createError({ statusCode: 403, statusMessage: 'User not found' });
  }

  const query = getQuery(event);
  const now = new Date();

  let month = Number(query.month);
  let year = Number(query.year);

  // Default to current month if params are missing or invalid
  if (!month || !year || isNaN(month) || isNaN(year)) {
    month = now.getMonth() + 1;
    year = now.getFullYear();
  }

  // Upsert timesheet: Create DRAFT if it doesn't exist for this period
  const timesheet = await safeQuery(() =>
    prisma.timesheetPeriod.upsert({
      where: {
        userId_month_year: {
          userId: dbUser.id,
          month,
          year,
        },
      },
      update: {}, // No updates if exists
      create: {
        userId: dbUser.id,
        month,
        year,
        status: 'DRAFT',
      },
      include: {
        entries: {
          orderBy: { date: 'asc' },
          include: {
            assignment: {
              include: {
                class: { select: { name: true } },
                student: { select: { name: true } },
              },
            },
          },
        },
      },
    })
  );

  // Fetch user's assignments
  const assignments = await safeQuery(() =>
    prisma.assignment.findMany({
      where: { teacherId: dbUser.id },
      include: {
        class: { select: { name: true } },
        student: { select: { name: true } },
      },
    })
  );

  return { timesheet, assignments, userRole: dbUser.role };
});
