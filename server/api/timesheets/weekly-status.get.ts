import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db'; // Adjust path if needed
import { getISOWeek, getISOWeekYear } from 'date-fns';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const query = getQuery(event);
  const dateStr = query.date as string;

  if (!dateStr) {
    throw createError({ statusCode: 400, statusMessage: 'Date is required' });
  }

  const date = new Date(dateStr);
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  // Actually, getISOWeek and getYear (from date-fns) might diverge around new year.
  // Ideally use getISOWeekYear.
  // For now let's use the provided date to determine the "WeeklyStatus" key.

  // Find the DB user
  const dbUser = await safeQuery(() =>
    prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, role: true },
    })
  );

  if (!dbUser) {
    return { status: 'PENDING' }; // or error
  }

  let targetUserId = dbUser.id;

  // If requesting for another user (Admin only)
  if (
    (query.userId || query.teacherEmail) &&
    (dbUser.role === 'ROOT' || dbUser.role === 'MANAGER')
  ) {
    if (query.userId) {
      targetUserId = query.userId as string;
    } else if (query.teacherEmail) {
      // Resolve email to ID
      const requestedUser = await safeQuery(() =>
        prisma.user.findUnique({
          where: { email: query.teacherEmail as string },
        })
      );
      if (requestedUser) targetUserId = requestedUser.id;
    }
  }

  const statusRecord = await safeQuery(() =>
    prisma.weeklyTimesheetStatus.findUnique({
      where: {
        userId_year_week: {
          userId: targetUserId,
          year,
          week,
        },
      },
    })
  );

  return {
    status: statusRecord?.status || 'PENDING',
    rejectionReason: statusRecord?.rejectionReason,
    submissionDate: statusRecord?.submissionDate,
    approvalDate: statusRecord?.approvalDate,
  };
});
