import { z } from 'zod';

const upsertEntrySchema = z.object({
  id: z.string().optional(),
  timesheetId: z.string().min(1),
  date: z.string().datetime(), // ISO string from frontend
  duration: z.number().min(0).max(24),
  assignmentId: z.string().min(1),
  type: z.string().optional().default('Normal'),
  description: z.string().optional().default(''),
  observations: z.string().optional().default(''),
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
  if (timesheet.user.email !== user.email) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  if (['SUBMITTED', 'APPROVED'].includes(timesheet.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot edit submitted or approved timesheets',
    });
  }

  // Handle Update vs Create based on ID
  if (id) {
    // Update existing entry
    return await prisma.timeEntry.update({
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
    // Create new entry (or rely on unique constraint to fail if duplicate? Or upsert by composite?)
    // If we simply create, strict constraints might fail if exact dupe.
    // Let's us upsert by composite key to be safe for "Add" flow on blank cells,
    // BUT "Add" flow shouldn't reuse existing unless it's the exact same timestamp.
    // Given we now include TIME in date, collision is unlikely unless double-click.

    // Safer to use upsert with composite to avoid unique constraint errors on double-submit
    return await prisma.timeEntry.upsert({
      where: {
        timesheetPeriodId_date_assignmentId: {
          timesheetPeriodId: timesheetId,
          date: new Date(date),
          assignmentId: assignmentId,
        },
      },
      update: {
        duration,
        description,
        type,
        observations,
      },
      create: {
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
});
