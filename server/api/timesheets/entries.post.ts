import { z } from 'zod';

const upsertEntrySchema = z.object({
  timesheetId: z.string().uuid(),
  date: z.string().datetime(), // ISO string from frontend
  duration: z.number().min(0).max(24),
  assignmentId: z.string().uuid(),
  description: z.string().optional().default(''),
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

  const { timesheetId, date, duration, assignmentId, description } =
    validation.data;

  // Verify Timesheet ownership (and implicitly existence)
  const timesheet = await prisma.timesheetPeriod.findUnique({
    where: { id: timesheetId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  if (!timesheet) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Timesheet not found',
    });
  }

  // RBAC: Only owner or logic to check status
  // Ideally, only handle edits if status is DRAFT or REJECTED
  if (timesheet.user.email !== user.email) {
    // TODO: Allow managers to edit? For now, strict ownership.
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  if (['SUBMITTED', 'APPROVED'].includes(timesheet.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot edit submitted or approved timesheets',
    });
  }

  // Upsert Entry
  // We use the composite unique key [timesheetPeriodId, date, assignmentId]
  const entry = await prisma.timeEntry.upsert({
    where: {
      timesheetPeriodId_date_assignmentId: {
        timesheetPeriodId: timesheetId,
        date: new Date(date), // Ensure Date object
        assignmentId: assignmentId,
      },
    },
    update: {
      duration,
      description,
    },
    create: {
      timesheetPeriodId: timesheetId,
      date: new Date(date),
      duration,
      assignmentId,
      description,
    },
  });

  return entry;
});
