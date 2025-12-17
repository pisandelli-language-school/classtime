import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Verify if user is a MANAGER or ROOT
  console.log('Pending API: Auth User:', user.email);

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });
  console.log('Pending API: DB User:', dbUser);

  if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ROOT')) {
    console.log('Pending API: Access Denied');
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Managers only',
    });
  }

  // Fetch all pending timesheets (SUBMITTED status)
  const pendingTimesheets = await prisma.timesheetPeriod.findMany({
    where: {
      status: 'SUBMITTED',
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      entries: true,
    },
    orderBy: {
      year: 'desc',
    },
  });

  // Calculate totals and format for UI
  return pendingTimesheets.map((ts: any) => {
    const totalHours = ts.entries.reduce(
      (acc: number, entry: any) => acc + Number(entry.duration),
      0
    );
    return {
      id: ts.id,
      userId: ts.userId,
      userName: ts.user ? ts.user.name || ts.user.email : 'Unknown',
      month: ts.month,
      year: ts.year,
      totalHours,
      submittedAt: ts.updatedAt || new Date(),
    };
  });
});
