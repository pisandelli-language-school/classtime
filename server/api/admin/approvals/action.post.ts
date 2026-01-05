import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../../utils/db'; // Adjust depth: server/api/admin/approvals -> ../../../utils/db
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { WeeklyStatus, Role } from '@prisma/client';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Admin Check
  const currentUser = await safeQuery(() =>
    prisma.user.findUnique({ where: { email: user.email } })
  );

  if (
    !currentUser ||
    (currentUser.role !== Role.ROOT && currentUser.role !== Role.MANAGER)
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const body = await readBody(event);
  const { teacherId, date, action, reason } = body;

  if (!teacherId || !date || !action) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }

  const weekDate = new Date(date);
  const week = getISOWeek(weekDate);
  const year = getISOWeekYear(weekDate);

  let newStatus: WeeklyStatus;
  if (action === 'APPROVE') {
    newStatus = WeeklyStatus.APPROVED;
  } else if (action === 'REJECT') {
    newStatus = WeeklyStatus.REJECTED;
    if (!reason) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Rejection reason is required',
      });
    }
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Invalid action' });
  }

  const result = await safeQuery(() =>
    prisma.weeklyTimesheetStatus.upsert({
      where: {
        userId_year_week: {
          userId: teacherId,
          year,
          week,
        },
      },
      update: {
        status: newStatus,
        approvalDate: new Date(),
        rejectionReason: action === 'REJECT' ? reason : null,
      },
      create: {
        userId: teacherId,
        year,
        week,
        status: newStatus,
        approvalDate: new Date(),
        rejectionReason: action === 'REJECT' ? reason : null,
      },
    })
  );

  // Todo: Log Audit? The scheme has AuditLog, maybe later.

  return { success: true, result };
});
