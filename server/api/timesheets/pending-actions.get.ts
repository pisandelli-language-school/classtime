import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { WeeklyStatus } from '@prisma/client';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const query = getQuery(event);
  const targetEmail = (query.teacherEmail as string) || user.email;

  // Fetch acting user to check permissions
  const actingUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!actingUser) return { actions: [] };

  // If trying to access another user's data, check Admin role
  if (targetEmail !== user.email) {
    if (actingUser.role !== 'ROOT' && actingUser.role !== 'MANAGER') {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    }
  }

  // Fetch target DB user
  const dbUser = await safeQuery(() =>
    prisma.user.findUnique({ where: { email: targetEmail } })
  );

  if (!dbUser) return { actions: [] };

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const currentYear = getISOWeekYear(now);

  // 1. Fetch Rejections
  const rejectedWeeks = await safeQuery(() =>
    prisma.weeklyTimesheetStatus.findMany({
      where: {
        userId: dbUser.id,
        status: WeeklyStatus.REJECTED,
      },
      orderBy: [{ year: 'desc' }, { week: 'desc' }],
    })
  );

  // 2. Fetch Unsubmitted Past Weeks with Entries
  // We need to find weeks that contain entries but are NOT Submitted/Approved.
  // This is a bit heavy: Find all entries, distinct year/week.
  // Limiting to last 3 months ~ 12 weeks to avoid scanning huge history.

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const entries = await safeQuery(() =>
    prisma.timeEntry.findMany({
      where: {
        timesheetPeriod: { userId: dbUser.id },
        date: { gte: threeMonthsAgo },
      },
      select: { date: true },
    })
  );

  // Set of distinct weeks with entries
  const weeksWithEntries = new Set<string>();
  entries.forEach((e) => {
    const d = new Date(e.date);
    const w = getISOWeek(d);
    const y = getISOWeekYear(d);
    // Exclude current week
    if (y === currentYear && w === currentWeek) return;
    if (y > currentYear || (y === currentYear && w > currentWeek)) return; // Future

    weeksWithEntries.add(`${y}-${w}`);
  });

  // Fetch statuses for these weeks
  // We already fetched rejections, let's fetch ALL statuses for this user to check "Submitted/Approved"
  const allStatuses = await safeQuery(() =>
    prisma.weeklyTimesheetStatus.findMany({
      where: { userId: dbUser.id },
      select: { year: true, week: true, status: true },
    })
  );

  const statusMap = new Map<string, WeeklyStatus>();
  allStatuses.forEach((s) => statusMap.set(`${s.year}-${s.week}`, s.status));

  const missingSubmissions: any[] = [];

  weeksWithEntries.forEach((key) => {
    const [yStr, wStr] = key.split('-');
    const y = parseInt(yStr);
    const w = parseInt(wStr);

    const status = statusMap.get(key);

    // If no status OR status is PENDING (Draft) -> It's missing submission
    if (!status || status === WeeklyStatus.PENDING) {
      missingSubmissions.push({
        year: y,
        week: w,
        type: 'MISSING',
        label: `Semana ${w}/${y}`,
      });
    }
  });

  // Merge
  const actions = [
    ...rejectedWeeks.map((r) => ({
      year: r.year,
      week: r.week,
      type: 'REJECTED',
      reason: r.rejectionReason,
      label: `Semana ${r.week}/${r.year}`,
    })),
    ...missingSubmissions,
  ];

  // Sort: Rejections first, then recent missing
  return {
    actions: actions.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'REJECTED' ? -1 : 1;
      // Descending date
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    }),
  };
});
