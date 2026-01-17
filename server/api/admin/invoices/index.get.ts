import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../../utils/db';
import { Role, InvoiceStatus } from '@prisma/client';
import {
  getISOWeek,
  getISOWeekYear,
  endOfMonth,
  startOfMonth,
  eachWeekOfInterval,
  endOfWeek,
} from 'date-fns';

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
  const month = Number(query.month);
  const year = Number(query.year);

  if (!month || !year) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Month and Year required',
    });
  }

  // 1. Get all Teachers
  const teachers = await safeQuery(() =>
    prisma.user.findMany({
      where: { role: Role.TEACHER, active: true },
      orderBy: { name: 'asc' },
      include: {
        invoices: {
          where: { month, year },
        },
      },
    })
  );

  // 2. For each teacher, determine status
  // We need to know if all weeks in that month are APPROVED.
  // Strategy:
  // Identify all ISO weeks that "belong" to this month.
  // Rule: A week belongs to the month if its Thursday is in the month? Or simpler:
  // We check all weeks that overlap?
  // Let's use a strict approach: The invoice covers a specific set of weeks?
  // OR the invoice covers the calendar month (1st to 31st)?
  // User said "Mês e ano da fatura". "Horas lançadas/aprovadas".
  // Usually timesheets are weekly.
  // Let's assume we aggregate ALL weeks that *end* in this month? Or strictly date range?
  // User's previous logic for "Monthly Goal" was: entries in 1..31.
  // Check approvals: Approvals are by Week.
  // If a week spans Jan/Feb (e.g. Jan 29 - Feb 4), does it belong to Jan or Feb invoice?
  // Standard practice: Payment is by Week or by Month. If by Month, providing hourly, usually precise date range 1-31.
  // BUT approvals are Weekly.
  // User Requirement 6: "Não podemos fechar uma fatura se houver pendências... aprovação".
  // IMPLIES: We must resolve the status of every week involved.
  // Decision: We simply check if there are ANY unapproved entries in the date range?
  // OR check the status of all weeks that fall majority in this month.

  // Let's define the "Month Range":
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  // Get all weeks overlapping this range?
  // Actually, simplified: Check `WeeklyTimesheetStatus` for all weeks that have at least 1 day in this month?
  // Let's just check if there are ANY entries in the date range that are NOT in an Approved Week?
  // No, `WeeklyTimesheetStatus` is the source of truth for "Approved".

  // Let's query statuses for weeks relevant to this month.
  // We can just iterate the teachers and for each, fetch their status.
  // Optimization: Fetch all statuses for these users in year/month range?

  const results = await Promise.all(
    teachers.map(async (t) => {
      // Existing Invoice?
      const existingInvoice = t.invoices[0];
      if (existingInvoice) {
        return {
          teacher: { id: t.id, name: t.name, email: t.email, avatar: null }, // TODO: Avatar from Google?
          status: existingInvoice.status, // CLOSED, PAID
          invoiceId: existingInvoice.id,
          summary: {
            totalHours: existingInvoice.totalHours,
            amount: existingInvoice.totalAmount,
          },
        };
      }

      // No Invoice -> Check Readiness
      // 1. Get all entries for this month (1-31)
      const entries = await prisma.timeEntry.findMany({
        where: {
          timesheetPeriod: { userId: t.id },
          date: { gte: start, lte: end },
        },
        select: { date: true, duration: true },
      });

      // If no entries -> "Empty Month".
      // User Regra 7: "Posso fechar... mesmo que não tenha nenhuma hora".
      // Does "Empty" require approval?
      // If 0 entries, implies 0 work. Is there a "Week Status" for empty weeks? No.
      // So if entries.length == 0, is it Ready? Yes.

      if (entries.length === 0) {
        return {
          teacher: { id: t.id, name: t.name, email: t.email },
          status: 'READY', // Ready to close (Empty)
          summary: { totalHours: 0, amount: 0, warning: 'Sem horas lançadas' },
        };
      }

      // 2. Identify Weeks involved
      // We need to ensure that for every entry found, its Week is APPROVED.
      const uniqueWeeks = new Set<string>();
      entries.forEach((e) => {
        const d = new Date(e.date);
        uniqueWeeks.add(`${getISOWeekYear(d)}-${getISOWeek(d)}`);
      });

      // Check Status of these weeks
      let allApproved = true;
      let pendingCount = 0;

      for (const weekKey of uniqueWeeks) {
        const [y, w] = weekKey.split('-').map(Number);
        const status = await prisma.weeklyTimesheetStatus.findUnique({
          where: { userId_year_week: { userId: t.id, year: y, week: w } },
        });

        if (!status || status.status !== 'APPROVED') {
          allApproved = false;
          pendingCount++;
        }
      }

      const totalHours = entries.reduce(
        (sum, e) => sum + Number(e.duration),
        0
      );
      // Approximate amount (using current rate)
      const rate = Number(t.hourlyRate || 0);
      const estAmount = totalHours * rate;

      return {
        teacher: { id: t.id, name: t.name, email: t.email, hourlyRate: rate },
        status: allApproved ? 'READY' : 'PENDING',
        missingApprovals: pendingCount,
        summary: { totalHours, amount: estAmount },
      };
    })
  );

  return { success: true, data: results };
});
