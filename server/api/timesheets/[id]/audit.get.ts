import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../../utils/db'; // Make sure path is correct
import { Role } from '@prisma/client';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const timesheetId = getRouterParam(event, 'id');
  if (!timesheetId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' });
  }

  // Fetch dbUser for RBAC
  const dbUser = await safeQuery(() =>
    prisma.user.findUnique({ where: { email: user.email } })
  );

  if (!dbUser || (dbUser.role !== Role.ROOT && dbUser.role !== Role.MANAGER)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  // Fetch Audit Logs associated with this Timesheet
  // Association mechanisms:
  // 1. targetId == timesheetId (Submit, Approve, Reject)
  // 2. metadata.timesheetId == timesheetId (Create, Update, Delete Entry)

  const logs = await safeQuery(() =>
    prisma.auditLog.findMany({
      where: {
        OR: [
          { targetId: timesheetId },
          {
            metadata: {
              path: ['timesheetId'],
              equals: timesheetId,
            },
          },
        ],
      },
      include: {
        actor: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })
  );

  return { success: true, logs };
});
