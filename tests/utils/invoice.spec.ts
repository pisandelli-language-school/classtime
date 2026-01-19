import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceTotals,
  calculatePaymentDueDate,
} from '../../server/utils/invoice';
import { addDays, isWeekend } from 'date-fns';

describe('Invoice Utils', () => {
  describe('calculateInvoiceTotals', () => {
    it('should calculate base amount correctly', () => {
      const result = calculateInvoiceTotals(10, 50, []);
      expect(result.baseAmount).toBe(500);
      expect(result.finalAmount).toBe(500);
    });

    it('should handle credit adjustments', () => {
      const items = [{ amount: 100, type: 'CREDIT' }];
      const result = calculateInvoiceTotals(10, 50, items);
      expect(result.baseAmount).toBe(500);
      expect(result.adjustmentsTotal).toBe(100);
      expect(result.finalAmount).toBe(600);
    });

    it('should handle debit adjustments', () => {
      const items = [{ amount: 50, type: 'DEBIT' }];
      const result = calculateInvoiceTotals(10, 50, items);
      expect(result.finalAmount).toBe(450);
    });

    it('should handle mixed adjustments', () => {
      const items = [
        { amount: 100, type: 'CREDIT' },
        { amount: 30, type: 'DEBIT' },
      ];
      const result = calculateInvoiceTotals(10, 50, items);
      expect(result.adjustmentsTotal).toBe(70);
      expect(result.finalAmount).toBe(570);
    });
  });

  describe('calculatePaymentDueDate', () => {
    it('should add business days correctly', () => {
      // Monday
      const start = new Date(2023, 0, 2);
      // Friday (4 days later)
      const result = calculatePaymentDueDate(start, 4);
      expect(result.getDate()).toBe(6);
    });

    it('should skip weekends', () => {
      // Friday
      const start = new Date(2023, 0, 6);
      // Should be next Monday (1 business day)
      const result = calculatePaymentDueDate(start, 1);
      expect(result.getDay()).not.toBe(0); // Not Sunday
      expect(result.getDay()).not.toBe(6); // Not Saturday
      expect(result.getDate()).toBe(9); // Monday Jan 9th
    });
  });
});
