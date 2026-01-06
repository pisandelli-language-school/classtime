import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { WeeklyStatus } from '@prisma/client';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const body = await readBody(event);
  const dateStr = body.date;

  if (!dateStr) {
    throw createError({ statusCode: 400, statusMessage: 'Date is required' });
  }

  const date = new Date(dateStr);
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);

  const dbUser = await safeQuery(() =>
    prisma.user.findUnique({ where: { email: user.email } })
  );

  if (!dbUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  // Optional: Validate if there are entries?
  // User might want to submit empty week like "I didn't work"?
  // Let's allow it for now, or just warn in frontend.

  // Determine Target User ID
  let targetUserId = dbUser.id;
  const requestedTeacherEmail = body.teacherEmail?.toLowerCase(); // Use separate field for safety

  if (requestedTeacherEmail) {
    if (dbUser.role === 'ROOT' || dbUser.role === 'MANAGER') {
      const requestedUser = await safeQuery(() =>
        prisma.user.findUnique({ where: { email: requestedTeacherEmail } })
      );
      if (requestedUser) {
        targetUserId = requestedUser.id;
      } else {
        throw createError({
          statusCode: 404,
          statusMessage: 'Teacher not found',
        });
      }
    } else {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Cannot submit for others',
      });
    }
  }

  const status = await safeQuery(() =>
    prisma.weeklyTimesheetStatus.upsert({
      where: {
        userId_year_week: {
          userId: targetUserId,
          year,
          week,
        },
      },
      update: {
        status: WeeklyStatus.SUBMITTED,
        submissionDate: new Date(),
        rejectionReason: null, // Clear previous rejection reason
      },
      create: {
        userId: targetUserId,
        year,
        week,
        status: WeeklyStatus.SUBMITTED,
        submissionDate: new Date(),
      },
    })
  );

  return { success: true, status };
});
