import { z } from 'zod';

const upsertEntrySchema = z.object({
  id: z.string().optional(),
  timesheetId: z.string().min(1),
  date: z.string().datetime(), // ISO string from frontend
  duration: z.number().min(0).max(24),
  assignmentId: z.string().optional().nullable(),
  type: z.string().optional().default('Normal'),
  description: z.string().max(250).optional().default(''),
  observations: z.string().max(250).optional().default(''),
  attendeeIds: z.array(z.string()).optional(),
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
    attendeeIds,
  } = validation.data;

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
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot edit submitted or approved timesheets',
    });
  }

  // Transaction for operation + audit
  return await prisma.$transaction(async (tx) => {
    let result;
    let actionType = 'CREATE_ENTRY';

    const attendeesConnect = attendeeIds?.map((id) => ({ id })) || [];

    if (id) {
      // Update
      actionType = 'UPDATE_ENTRY';
      result = await tx.timeEntry.update({
        where: { id },
        data: {
          date: new Date(date),
          duration,
          ...(assignmentId
            ? { assignment: { connect: { id: assignmentId } } }
            : { assignment: { disconnect: true } }),
          description,
          type,
          observations,
          attendees: {
            set: attendeesConnect,
          },
        },
      });
    } else {
      // Create
      result = await tx.timeEntry.create({
        data: {
          timesheetPeriod: { connect: { id: timesheetId } },
          date: new Date(date),
          duration,
          ...(assignmentId
            ? { assignment: { connect: { id: assignmentId } } }
            : {}),
          description,
          type,
          observations,
          attendees: {
            connect: attendeesConnect,
          },
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
