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

  // Fetch acting user (dbUser)
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    throw createError({ statusCode: 403, statusMessage: 'User not found' });
  }

  // Fetch the entry to verify ownership and timesheet status
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: {
      timesheetPeriod: {
        include: {
          user: {
            select: { id: true, email: true },
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

  const timesheet = entry.timesheetPeriod;
  const isOwner = timesheet.user.id === dbUser.id;
  const isAdmin = dbUser.role === 'ROOT' || dbUser.role === 'MANAGER';

  // Check ownership/permission
  if (!isOwner && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  // Check timesheet status
  if (['SUBMITTED', 'APPROVED'].includes(timesheet.status)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Cannot delete entries from submitted or approved timesheets',
    });
  }

  // Delete the entry with Audit
  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.delete({
      where: { id },
    });

    if (!isOwner) {
      await tx.auditLog.create({
        data: {
          actorId: dbUser.id,
          // @ts-ignore
          action: 'DELETE_ENTRY',
          targetId: id, // ID of deleted entry
          metadata: {
            timesheetId: timesheet.id,
            ownerId: timesheet.userId,
            description: `Admin deleted time entry for ${entry.date}`,
            deletedEntrySnapshot: {
              description: entry.description,
              duration: entry.duration,
              assignmentId: entry.assignmentId,
            },
          },
        },
      });
    }
  });

  return { success: true };
});
