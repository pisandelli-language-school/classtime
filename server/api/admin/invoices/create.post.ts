import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../../utils/db';
import { Role, InvoiceStatus, InvoiceItemType } from '@prisma/client';
import { getISOWeek, getISOWeekYear, endOfMonth, startOfMonth } from 'date-fns';
import {
  calculateInvoiceTotals,
  calculatePaymentDueDate,
} from '../../../utils/invoice';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Admin Check
  const currentUser = await safeQuery(() =>
    prisma.user.findUnique({ where: { email: user.email } }),
  );

  if (
    !currentUser ||
    (currentUser.role !== Role.ROOT && currentUser.role !== Role.MANAGER)
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const body = await readBody(event);
  const { teacherId, month, year, items } = body; // items: { description, amount, type }[]

  if (!teacherId || !month || !year) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }

  // 1. Fetch Teacher & Rate
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
  });
  if (!teacher)
    throw createError({ statusCode: 404, statusMessage: 'Teacher not found' });

  // 2. Validate Readiness (Double Check)
  // Re-run the logic from index.get.ts to ensure no race condition
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  const entries = await prisma.timeEntry.findMany({
    where: {
      timesheetPeriod: { userId: teacherId },
      date: { gte: start, lte: end },
    },
    select: { date: true, duration: true },
  });

  const uniqueWeeks = new Set<string>();
  entries.forEach((e) => {
    const d = new Date(e.date);
    uniqueWeeks.add(`${getISOWeekYear(d)}-${getISOWeek(d)}`);
  });

  for (const weekKey of uniqueWeeks) {
    const [y, w] = weekKey.split('-').map(Number);
    const status = await prisma.weeklyTimesheetStatus.findUnique({
      where: { userId_year_week: { userId: teacherId, year: y, week: w } },
    });

    if (!status || status.status !== 'APPROVED') {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot close invoice: Week ${w}/${y} is not approved.`,
      });
    }
  }

  // 3. Calculate Totals Uses Utility
  const totalHours = entries.reduce((sum, e) => sum + Number(e.duration), 0);
  const hourlyRate = Number(teacher.hourlyRate || 0);

  const { finalAmount, baseAmount, adjustmentsTotal } = calculateInvoiceTotals(
    totalHours,
    hourlyRate,
    items as any,
  );

  // 4. Calculate Due Date (5 Business Days)
  const dueDate = calculatePaymentDueDate(new Date(), 5);

  // 5. Create Invoice Transaction
  const invoice = await prisma.invoice.create({
    data: {
      teacherId,
      month,
      year,
      status: 'CLOSED', // Directly to CLOSED as per flow
      totalHours,
      totalAmount: finalAmount,
      hourlyRateSnapshot: hourlyRate,
      paymentDueDate: dueDate,
      closedAt: new Date(),
      closedBy: currentUser.id,
      items: {
        create: items.map((i: any) => ({
          description: i.description,
          amount: Number(i.amount),
          type: i.type as InvoiceItemType,
        })),
      },
    },
    include: { items: true },
  });

  return { success: true, invoice };
});
