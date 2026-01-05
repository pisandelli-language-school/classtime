import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db';
import {
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  endOfISOWeek,
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

  if (!dateStr) {
    throw createError({ statusCode: 400, statusMessage: 'Date required' });
  }

  const targetDate = new Date(dateStr);
  const week = getISOWeek(targetDate);
  const year = getISOWeekYear(targetDate);
  const weekStart = startOfISOWeek(targetDate);
  const weekEnd = endOfISOWeek(targetDate);

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
          where: { year, week },
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
        timesheetPeriod: { select: { userId: true } },
      },
    })
  );

  // 5. Merge Data
  const result = relevantGoogleUsers.map((gUser: any) => {
    const dbUser = dbUsers.find(
      (u) => u.email.toLowerCase() === gUser.primaryEmail?.toLowerCase()
    ) as any;

    // Default values if no DB user exists yet
    let status = 'PENDING';
    let weeklyWorkedHours = 0;
    let weeklyExpectedHours = 0;
    let submissionDate = null;
    let approvalDate = null;
    let rejectionReason = null;
    let dbId = dbUser?.id || null;

    if (dbUser) {
      // Status
      const statusRecord = dbUser.weeklyStatuses[0];
      if (statusRecord) {
        status = statusRecord.status;
        submissionDate = statusRecord.submissionDate;
        approvalDate = statusRecord.approvalDate;
        rejectionReason = statusRecord.rejectionReason;
      }

      // Worked Hours
      const userEntries = timeEntries.filter(
        (e) => e.timesheetPeriod.userId === dbUser.id
      );
      weeklyWorkedHours = userEntries.reduce(
        (acc, e) => acc + Number(e.duration),
        0
      );

      // Expected Hours
      if (dbUser.assignments) {
        dbUser.assignments.forEach((a) => {
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
          weeklyExpectedHours += wh;
        });
      }
    }

    return {
      id: dbId, // We still need dbId to approve/reject. If null, action will fail (User needs to login first to create DB record? OR we create it on fly?) -> For now let's pass what we have. API action might need to handle "missing db user"
      googleId: gUser.id,
      name: gUser.name?.fullName || gUser.primaryEmail,
      email: gUser.primaryEmail,
      avatar: gUser.thumbnailPhotoUrl || null,

      weeklyWorkedHours,
      weeklyExpectedHours,
      status,
      submissionDate,
      approvalDate,
      rejectionReason,
    };
  });

  // Filter out users who are purely Admins/Managers but have NO assignments and NO hours?
  // User said "Lista de professores".
  // If I list "Root" who never logs hours, it might be noise.
  // But strict requirement was "Use Google List".
  // Let's keep the filter (Teacher/Manager/Admin) as is.

  return { success: true, approvals: result };
});
