import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../utils/db';

import { Role } from '@prisma/client';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Sync User: Ensure local DB record exists
  const isRoot = user.email === process.env.ROOT_USER_EMAIL;

  let dbUser = await safeQuery(() =>
    prisma.user.upsert({
      where: { email: user.email },
      update: {
        // Update role if it's the root user trying to regain access, otherwise keep existing
        role: isRoot ? Role.ROOT : undefined,
        // Always update name from Supabase metadata if available
        name: user.user_metadata?.full_name || undefined,
      },
      create: {
        email: user.email,
        name: user.user_metadata?.full_name || user.email, // Try to get name from Supabase meta
        role: isRoot ? Role.ROOT : Role.TEACHER, // Default to Teacher for now as requested by user context generally, or Staff.
        active: true,
      },
    })
  );

  const query = getQuery(event);
  const now = new Date();

  let month = Number(query.month);
  let year = Number(query.year);

  // Default to current month if params are missing or invalid
  if (!month || !year || isNaN(month) || isNaN(year)) {
    month = now.getMonth() + 1;
    year = now.getFullYear();
  }

  // Determine Target User ID (Context Switch)
  let targetUserId = dbUser.id;
  const requestedTeacherEmail = query.teacherEmail as string;

  if (requestedTeacherEmail) {
    // Security Check: Only Admins/Managers can view other's timesheets
    if (dbUser.role === Role.ROOT || dbUser.role === Role.MANAGER) {
      // Try to find the requested user locally
      let requestedUser = await safeQuery(() =>
        prisma.user.findUnique({ where: { email: requestedTeacherEmail } })
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
          })
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
    })
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
        class: { select: { name: true, students: true } },
        student: { select: { name: true } },
      },
    })
  );

  return { timesheet, assignments, userRole: dbUser.role };
});
