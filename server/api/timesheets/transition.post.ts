import { TimesheetStatus, Role, Prisma } from '@prisma/client';
import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const config = useRuntimeConfig();
  const allowedDomain = config.public.googleWorkspaceDomain;
  if (allowedDomain && !user.email.endsWith(`@${allowedDomain}`)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid email domain',
    });
  }

  const body = await readBody(event);
  const { timesheetId, action, reason } = body;

  if (!timesheetId || !action) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing timesheetId or action',
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    throw createError({
      statusCode: 403,
      statusMessage: 'User not found in system',
    });
  }

  const timesheet = await prisma.timesheetPeriod.findUnique({
    where: { id: timesheetId },
  });

  if (!timesheet) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Timesheet not found',
    });
  }

  let nextStatus: TimesheetStatus;
  let auditAction: 'SUBMIT' | 'APPROVE' | 'REJECT';

  switch (action) {
    case 'SUBMIT':
      if (timesheet.userId !== dbUser.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Cannot submit others timesheet',
        });
      }
      if (
        timesheet.status !== TimesheetStatus.DRAFT &&
        timesheet.status !== TimesheetStatus.REJECTED
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Can only submit Draft or Rejected timesheets',
        });
      }
      nextStatus = TimesheetStatus.SUBMITTED;
      auditAction = 'SUBMIT';
      break;

    case 'APPROVE':
      if (dbUser.role !== Role.MANAGER && dbUser.role !== Role.ROOT) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Only Managers can approve',
        });
      }
      if (timesheet.status !== TimesheetStatus.SUBMITTED) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Can only approve Submitted timesheets',
        });
      }
      nextStatus = TimesheetStatus.APPROVED;
      auditAction = 'APPROVE';
      break;

    case 'REJECT':
      if (dbUser.role !== Role.MANAGER && dbUser.role !== Role.ROOT) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Only Managers can reject',
        });
      }
      if (timesheet.status !== TimesheetStatus.SUBMITTED) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Can only reject Submitted timesheets',
        });
      }
      if (!reason) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Rejection reason is required',
        });
      }
      nextStatus = TimesheetStatus.REJECTED;
      auditAction = 'REJECT';
      break;

    default:
      throw createError({ statusCode: 400, statusMessage: 'Invalid action' });
  }

  // Transaction for atomic update and logging
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const updated = await tx.timesheetPeriod.update({
        where: { id: timesheetId },
        data: {
          status: nextStatus,
          rejectionReason: action === 'REJECT' ? reason : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: dbUser.id,
          action: auditAction,
          targetId: timesheetId,
          metadata: {
            previousStatus: timesheet.status,
            reason: reason || null,
          },
        },
      });

      return updated;
    }
  );

  return result;
});
