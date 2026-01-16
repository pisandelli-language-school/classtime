import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db';
import {
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  endOfISOWeek,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { Role } from '@prisma/client';
import { google } from 'googleapis';
import path from 'path';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Admin Check
  const currentUser = await safeQuery(() =>
    prisma.user.findUnique({ where: { email: user.email } })
  );

  if (
    !currentUser ||
    (currentUser.role !== Role.ROOT && currentUser.role !== Role.MANAGER)
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const query = getQuery(event);
  const dateStr = query.date as string;
  const mode = (query.mode as string) || 'week'; // 'week' | 'backlog'

  if (!dateStr) {
    throw createError({ statusCode: 400, statusMessage: 'Date required' });
  }

  const targetDate = new Date(dateStr);

  // Week Mode Config
  let weekStart = startOfISOWeek(targetDate);
  let weekEnd = endOfISOWeek(targetDate);
  let targetYear = getISOWeekYear(targetDate);
  let targetWeek = getISOWeek(targetDate);

  // Backlog Mode Config
  // We want everything BEFORE the current month's start week?
  // Or just everything "old". User said "until first week of current month".
  // Let's set a wide range for backlog.
  if (mode === 'backlog') {
    // Expand retrieval window. Let's go back 6 months for safety/performance
    weekStart = subMonths(targetDate, 6);

    // Backlog includes EVERYTHING STRICTLY BEFORE the current week.
    // This ensures no "gap" for days in the current month that belong to previous weeks.
    // We take the start of the current week and subtract 1 millisecond to get the end of the previous week?
    // Or simpler: endOfISOWeek of the previous week.
    const startOfCurrentWeek = startOfISOWeek(targetDate);
    // Subtract 1 day to get into previous week, then get end of that week
    const previousWeekDate = new Date(startOfCurrentWeek);
    previousWeekDate.setDate(previousWeekDate.getDate() - 1);
    weekEnd = endOfISOWeek(previousWeekDate);
  }

  // 1. Google Auth & Directory API
  const keyFilePath = path.resolve(
    process.cwd(),
    'classtime-481322-e6e3f2bf7f96.json'
  );
  const subject = process.env.ROOT_USER_EMAIL;

  let googleUsers: any[] = [];
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
      clientOptions: { subject },
    });
    const service = google.admin({ version: 'directory_v1', auth });
    const googleRes = await service.users.list({
      customer: 'my_customer',
      orderBy: 'email',
      maxResults: 500,
      projection: 'full',
    });
    googleUsers = googleRes.data.users || [];
  } catch (e) {
    console.error('Failed to fetch Google Users:', e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch Google Users',
    });
  }

  // 2. Filter Google Users for Teachers/Managers/Admins
  const relevantGoogleUsers = googleUsers.filter((u: any) => {
    const customFields = u.customSchemas?.Custom_Fields || {};
    // Include ONLY if Teacher flag is true
    return customFields.teacher === true || customFields.teacher === 'true';
  });

  // 3. Fetch Local DB Data (Status & Entries) for these users
  const emails = relevantGoogleUsers
    .map((u) => u.primaryEmail?.toLowerCase())
    .filter(Boolean);

  const dbUsers = await safeQuery(() =>
    prisma.user.findMany({
      where: {
        email: { in: emails as string[], mode: 'insensitive' },
      },
      include: {
        weeklyStatuses: {
          where:
            mode === 'week'
              ? { year: targetYear, week: targetWeek }
              : {
                  // Backlog: Fetch distinct statuses from recent years (e.g. last 1 year)
                  // We perform strict date/status filtering in JS to handle ISO week logic correctly
                  year: { gte: targetYear - 1 },
                },
        },
        assignments: {
          include: {
            class: {
              select: {
                contracts: { where: { status: 'ACTIVE' } },
                weeklyHours: true,
                name: true,
              },
            },
            student: {
              include: {
                contracts: { where: { status: 'ACTIVE' } },
              },
            },
          },
        },
      },
    })
  );

  const dbUserIds = dbUsers.map((u) => u.id);

  // 4. Fetch Entries separately
  const timeEntries = await safeQuery(() =>
    prisma.timeEntry.findMany({
      where: {
        timesheetPeriod: {
          userId: { in: dbUserIds },
        },
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        duration: true,
        date: true,
        timesheetPeriod: { select: { userId: true } },
      },
    })
  );

  // 5. Merge Data
  const result: any[] = [];

  relevantGoogleUsers.forEach((gUser: any) => {
    const dbUser = dbUsers.find(
      (u) => u.email.toLowerCase() === gUser.primaryEmail?.toLowerCase()
    ) as any;

    // Base user object
    const baseUserObj = {
      id: dbUser?.id || null,
      googleId: gUser.id,
      name: gUser.name?.fullName || gUser.primaryEmail,
      email: gUser.primaryEmail,
      avatar: gUser.thumbnailPhotoUrl || null,
      weeklyExpectedHours: 0,
    };

    // Calculate Expected Hours (Base - assumes constant)
    if (dbUser && dbUser.assignments) {
      dbUser.assignments.forEach((a: any) => {
        let wh = 0;
        if (a.class) {
          if (a.class.contracts && a.class.contracts.length > 0) {
            wh = Number(a.class.contracts[0].weeklyHours);
          } else {
            wh = Number(a.class.weeklyHours || 0);
          }
        } else if (a.student) {
          if (a.student.contracts && a.student.contracts.length > 0) {
            wh = Number(a.student.contracts[0].weeklyHours);
          }
        }
        baseUserObj.weeklyExpectedHours += wh;
      });
    }

    if (!dbUser) {
      // If no DB user, only show empty pending for 'week' mode
      if (mode === 'week') {
        result.push({
          ...baseUserObj,
          weeklyWorkedHours: 0,
          status: 'PENDING',
          submissionDate: null,
          approvalDate: null,
          rejectionReason: null,
          weekLabel: null,
        });
      }
      return;
    }

    // Determine weeks to output
    let weeksToProcess: { label: string; year: number; week: number }[] = [];

    if (mode === 'week') {
      weeksToProcess.push({
        label: 'Current',
        year: targetYear,
        week: targetWeek,
      });
    } else {
      // Backlog: Find distinct weeks from unapproved Statuses AND unbilled Entries
      const distinctWeeks = new Set<string>();

      // 1. From Statuses
      dbUser.weeklyStatuses.forEach((ws: any) => {
        // Validate if this week is within backlog range ( <= cutoff)
        // Better: use the date-fns helper correctly. setISOWeek/Year operates on 'now', careful near year boundaries.
        // Let's use simple logic:
        // if (ws.year < backlogCutoffYear) or (ws.year == cutoffYear && ws.week < cutoffWeek) ?
        // Using date object is safer.
        // weekEnd is the cutoff DATE (end of last allowed week).
        // Let's get the end of the week for this status.
        // Helper needed to construct date from ISO week/year safely.
        // We can just rely on the fact that if it's > weekEnd, discard.
        // But constructing the date is the tricky part without the helper.
        // We imported helper functions? No, checking imports...
        // We have startOfISOWeek, endOfISOWeek. We don't have 'setISOWeek'.
        // Let's assume we can filter effectively.

        // Actually, easiest way:
        const checkDate = new Date(ws.year, 0, 4); // roughly start of year
        // We need 'date-fns' setISOWeek.
        // Let's use getISOWeekYear logic reverse?
        // Let's simplify: weekEnd gives us the Last Allowed Week Number/Year.
        const cutoffYear = getISOWeekYear(weekEnd);
        const cutoffWeek = getISOWeek(weekEnd);

        // Compare:
        if (
          ws.year < cutoffYear ||
          (ws.year === cutoffYear && ws.week <= cutoffWeek)
        ) {
          distinctWeeks.add(`${ws.year}-${ws.week}`);
        }
      });

      // 2. From Entries (already filtered by date range)
      const userEntries = timeEntries.filter(
        (e) => e.timesheetPeriod.userId === dbUser.id
      );
      userEntries.forEach((e) => {
        const date = new Date(e.date);
        const w = getISOWeek(date);
        const y = getISOWeekYear(date);
        distinctWeeks.add(`${y}-${w}`);
      });

      distinctWeeks.forEach((key) => {
        const [y, w] = key.split('-').map(Number);
        weeksToProcess.push({ label: `${w}/${y}`, year: y, week: w });
      });

      // Sort weeks descending (newest first)
      weeksToProcess.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
      });
    }

    // Process each week
    weeksToProcess.forEach((wk) => {
      // Status Record
      const statusRecord = dbUser.weeklyStatuses.find(
        (s: any) => s.year === wk.year && s.week === wk.week
      );

      // If mode is backlog, we STRICTLY filter out APPROVED
      if (
        mode === 'backlog' &&
        statusRecord &&
        statusRecord.status === 'APPROVED'
      )
        return;

      // Filter Entries for this specific week
      const userEntries = timeEntries.filter((e) => {
        if (e.timesheetPeriod.userId !== dbUser.id) return false;
        const d = new Date(e.date);
        return getISOWeek(d) === wk.week && getISOWeekYear(d) === wk.year;
      });

      const weeklyWorkedHours = userEntries.reduce(
        (acc, e) => acc + Number(e.duration),
        0
      );

      // Calculate Date Range Label
      // We can use date-fns to get start/end of that specific ISO week
      // Note: setISOWeek/Year helper or simple calculation
      // For efficiency, let's just pass year/week and let frontend format, OR compute here.
      // Let's compute a nice label here.
      // Wait, helper function needed to get date from week/year.
      // We can just rely on frontend 'weekLabel' logic if we pass start/end dates?
      // Or simplified: Just pass year/week to result.

      result.push({
        ...baseUserObj,
        weeklyWorkedHours,
        status: statusRecord ? statusRecord.status : 'PENDING',
        submissionDate: statusRecord?.submissionDate || null,
        approvalDate: statusRecord?.approvalDate || null,
        rejectionReason: statusRecord?.rejectionReason || null,
        weekInfo: {
          year: wk.year,
          week: wk.week,
        },
      });
    });
  });

  return {
    success: true,
    approvals: result,
    currentUserRole: currentUser.role,
  };
});
