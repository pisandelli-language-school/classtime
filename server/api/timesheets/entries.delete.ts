import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';

const deleteEntrySchema = z.object({
  id: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const query = getQuery(event);
  const validation = deleteEntrySchema.safeParse(query);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: validation.error.flatten(),
    });
  }

  const { id } = validation.data;

  // Fetch the entry to verify ownership and timesheet status
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: {
      timesheetPeriod: {
        include: {
          user: {
            select: { email: true },
          },
        },
      },
    },
  });

  if (!entry) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Entry not found',
    });
  }

  // Check ownership
  if (entry.timesheetPeriod.user.email !== user.email) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  // Check timesheet status
  if (['SUBMITTED', 'APPROVED'].includes(entry.timesheetPeriod.status)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Cannot delete entries from submitted or approved timesheets',
    });
  }

  // Delete the entry
  await prisma.timeEntry.delete({
    where: { id },
  });

  return { success: true };
});
