import { addBusinessDays } from 'date-fns';
import type { InvoiceItemType } from '@prisma/client';

export interface AdjustmentItem {
  amount: number | string;
  type: InvoiceItemType | string;
}

export const calculateInvoiceTotals = (
  totalHours: number,
  hourlyRate: number,
  items: AdjustmentItem[] = [],
) => {
  const baseAmount = totalHours * hourlyRate;
  let adjustmentsTotal = 0;

  if (items && Array.isArray(items)) {
    items.forEach((item) => {
      const val = Number(item.amount);
      if (item.type === 'CREDIT') adjustmentsTotal += val;
      if (item.type === 'DEBIT') adjustmentsTotal -= val;
    });
  }

  return {
    baseAmount,
    adjustmentsTotal,
    finalAmount: baseAmount + adjustmentsTotal,
  };
};

export const calculatePaymentDueDate = (
  fromDate: Date = new Date(),
  days: number = 5,
): Date => {
  return addBusinessDays(fromDate, days);
};
