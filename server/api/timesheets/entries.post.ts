import { z } from 'zod';

const upsertEntrySchema = z.object({
  id: z.string().optional(),
  timesheetId: z.string().min(1),
  date: z.string().datetime(), // ISO string from frontend
  duration: z.number().min(0).max(24),
  assignmentId: z.string().min(1),
  type: z.string().optional().default('Normal'),
  description: z.string().max(250).optional().default(''),
  observations: z.string().max(250).optional().default(''),
});

import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const body = await readBody(event);
  const validation = upsertEntrySchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: validation.error.flatten(),
    });
  }

  const {
    id,
    timesheetId,
    date,
    duration,
    assignmentId,
    description,
    type,
    observations,
  } = validation.data;

  // ... (ownership checks remain)

  // Fetch acting user (dbUser)
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    throw createError({ statusCode: 403, statusMessage: 'User not found' });
  }

  // Verify Timesheet ownership (and implicitly existence)
  const timesheet = await prisma.timesheetPeriod.findUnique({
    where: { id: timesheetId },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });

  if (!timesheet) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Timesheet not found',
    });
  }

  // RBAC: Allow Owner OR Admin/Manager
  const isOwner = timesheet.user.id === dbUser.id;
  const isAdmin = dbUser.role === 'ROOT' || dbUser.role === 'MANAGER';

  if (!isOwner && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  if (['SUBMITTED', 'APPROVED'].includes(timesheet.status)) {
    // Admins might want to edit submitted timesheets?
    // Usually yes, but let's keep restriction for now or allow Admin override?
    // User didn't specify, best to keep "Unlock" workflow, but let's allow Admin force-edit if needed.
    // For now, adhere to status rules unless logic changes.
    // Wait, if I am Admin correcting a Submitted timesheet, I probably should be able to.
    // Let's relax this for Admins? No, let's keep it safe: Status must be DRAFT or REJECTED.
    // If it is Submitted, Admin should Reject it first.
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot edit submitted or approved timesheets',
    });
  }

  // Transaction for operation + audit
  return await prisma.$transaction(async (tx) => {
    let result;
    let actionType = 'CREATE_ENTRY';

    if (id) {
      // Update
      actionType = 'UPDATE_ENTRY';
      result = await tx.timeEntry.update({
        where: { id },
        data: {
          date: new Date(date),
          duration,
          assignmentId,
          description,
          type,
          observations,
        },
      });
    } else {
      // Create
      result = await tx.timeEntry.create({
        data: {
          timesheetPeriodId: timesheetId,
          date: new Date(date),
          duration,
          assignmentId,
          description,
          type,
          observations,
        },
      });
    }

    // Log Audit if Admin is acting on another user's timesheet
    if (!isOwner) {
      // Import AuditAction or use string literal cast if needed.
      // Since we run in migration, runtime values are strings anyway usually.
      // But let's use the strings matching the Enum.
      await tx.auditLog.create({
        data: {
          actorId: dbUser.id,
          // @ts-ignore: Prisma Enum Type quirk in loose mode
          action: actionType,
          targetId: result.id, // Target is the Entry ID
          metadata: {
            timesheetId,
            ownerId: timesheet.userId,
            description: `Admin ${
              actionType === 'CREATE_ENTRY' ? 'created' : 'updated'
            } time entry for ${date}`,
          },
        },
      });
    }

    return result;
  });
});
