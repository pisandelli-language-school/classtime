import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db';

import { Role } from '@prisma/client';
import { getGoogleDirectoryService } from '../../utils/google';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  const userEmail = user.email!;

  // Sync User: Ensure local DB record exists
  const isRootEnv = user.email === process.env.ROOT_USER_EMAIL;

  // 1. Fetch Google User Info to determine Role
  let googleRole: Role = Role.TEACHER; // Default
  let googleName: string =
    user.user_metadata?.full_name || user.email || 'Sem Nome';

  try {
    const service = getGoogleDirectoryService();
    // Resolve Google ID to Email
    const googleUserRes = await service.users.get({
      userKey: user.email,
      projection: 'full',
    });
    const gUser = googleUserRes.data;
    googleName = gUser.name?.fullName || googleName;

    // Determine Role Logic (Matches users.get.ts)
    if (gUser.isAdmin) {
      googleRole = Role.ROOT;
    } else {
      const customFields = (gUser as any).customSchemas?.Custom_Fields || {};
      if (customFields.manager === true || customFields.manager === 'true') {
        googleRole = Role.MANAGER;
      }
      // If customFields.teacher is true, it remains TEACHER (default)
    }
  } catch (e) {
    console.error('Failed to fetch Google User for role sync:', e);
    // Fallback: If Env Root, force Root, otherwise keep default
    if (isRootEnv) googleRole = Role.ROOT;
  }

  // Override if Env Variable matches (Super Admin)
  if (isRootEnv) googleRole = Role.ROOT;

  let dbUser = await safeQuery(() =>
    prisma.user.upsert({
      where: { email: userEmail },
      update: {
        role: googleRole,
        name: googleName,
      },
      create: {
        email: userEmail,
        name: googleName,
        role: googleRole,
        active: true,
      },
    }),
  );

  const query = getQuery(event);
  const now = new Date();

  let month = Number(query.month);
  let year = Number(query.year);

  // Determine Fetching Strategy: Month vs Week
  let queryDate = query.date ? new Date(query.date as string) : new Date();
  if (isNaN(queryDate.getTime())) {
    queryDate = new Date();
  }

  // Also fetch entries for the entire ISO week to handle cross-month boundaries
  // This solves the issue where entries "disappear" if they belong to the adjacent month in the same week
  const { startOfISOWeek, endOfISOWeek } = await import('date-fns');
  const weekStart = startOfISOWeek(queryDate);
  const weekEnd = endOfISOWeek(queryDate);

  // Default to current month if params are missing or invalid
  if (!month || !year || isNaN(month) || isNaN(year)) {
    month = now.getMonth() + 1;
    year = now.getFullYear();
  }

  // Determine Target User ID (Context Switch)
  let targetUserId = dbUser.id;
  const requestedTeacherEmail = (query.teacherEmail as string)?.toLowerCase();

  if (requestedTeacherEmail) {
    // Security Check: Only Admins/Managers can view other's timesheets
    if (dbUser.role === Role.ROOT || dbUser.role === Role.MANAGER) {
      // Try to find the requested user locally
      let requestedUser = await safeQuery(() =>
        prisma.user.findUnique({ where: { email: requestedTeacherEmail } }),
      );

      // If not found, Provision/sync them on demand (Lazy Loading)
      if (!requestedUser) {
        // We assume valid Google Email because it came from the trusted Admin/Store list
        requestedUser = await safeQuery(() =>
          prisma.user.create({
            data: {
              email: requestedTeacherEmail,
              name: 'Usuário (Sincronizado)', // Name will be updated on next full sync or login
              role: Role.TEACHER,
              active: true,
            },
          }),
        );
      }

      if (requestedUser) {
        targetUserId = requestedUser.id;
      }
    }
  }

  // Upsert timesheet: Create DRAFT if it doesn't exist for this period
  const timesheet = await safeQuery(() =>
    prisma.timesheetPeriod.upsert({
      where: {
        userId_month_year: {
          userId: targetUserId,
          month,
          year,
        },
      },
      update: {}, // No updates if exists
      create: {
        userId: targetUserId,
        month,
        year,
        status: 'DRAFT',
      },
      include: {
        entries: {
          orderBy: { date: 'asc' },
          include: {
            assignment: {
              include: {
                class: { select: { name: true, students: true } },
                student: { select: { name: true } },
              },
            },
            attendees: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
  );

  // Fetch target user's assignments
  const assignments = await safeQuery(() =>
    prisma.assignment.findMany({
      where: {
        teacherId: targetUserId,
        OR: [
          {
            class: {
              contracts: {
                some: { status: 'ACTIVE' },
              },
            },
          },
          {
            student: {
              contracts: {
                some: { status: 'ACTIVE' },
              },
            },
          },
        ],
      },
      include: {
        class: {
          select: {
            name: true,
            students: true,
            contracts: { where: { status: 'ACTIVE' } },
          },
        },
        student: {
          select: {
            name: true,
            contracts: { where: { status: 'ACTIVE' } },
          },
        },
      },
    }),
  );

  // Calculate Monthly Expected Hours based on Active Contracts
  // Logic matches admin/users.get.ts: Sum of (Weekly Hours * 4) for all assigned classes/students
  let monthlyExpectedHours = 0;
  assignments.forEach((a: any) => {
    let weeklyHours = 0;
    if (a.class) {
      if (a.class.contracts && a.class.contracts.length > 0) {
        weeklyHours = Number(a.class.contracts[0].weeklyHours);
      }
    } else if (a.student) {
      if (a.student.contracts && a.student.contracts.length > 0) {
        weeklyHours = Number(a.student.contracts[0].weeklyHours);
      }
    }
    monthlyExpectedHours += weeklyHours * 4;
  });
  const entriesInWeek = await safeQuery(() =>
    prisma.timeEntry.findMany({
      where: {
        timesheetPeriod: { userId: targetUserId },
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: { date: 'asc' },
      include: {
        assignment: {
          include: {
            class: { select: { name: true, students: true } },
            student: { select: { name: true } },
          },
        },
        attendees: {
          select: { id: true, name: true },
        },
      },
    }),
  );

  // Calculate Total Worked Hours for the Month (Aggregate)
  const monthlyAggregation = await safeQuery(() =>
    prisma.timeEntry.aggregate({
      where: {
        timesheetPeriodId: timesheet.id,
      },
      _sum: {
        duration: true,
      },
    }),
  );
  const monthlyWorkedHours = Number(monthlyAggregation._sum.duration || 0);

  return {
    timesheet: {
      ...timesheet,
      entries: entriesInWeek, // Override entries with the full week set (or you could merge if preferred, but this is cleaner for the view)
    },
    assignments,
    userRole: dbUser.role,
    user: {
      monthlyExpectedHours,
      monthlyWorkedHours, // Return aggregate total
    },
  };
});
