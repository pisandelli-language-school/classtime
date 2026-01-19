import { vi } from 'vitest';

// Deep mock for Prisma Client
export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  timeEntry: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  invoice: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  weeklyTimesheetStatus: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
};

// Global mock registration (to be used in setup)
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  Role: {
    ROOT: 'ROOT',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    TEACHER: 'TEACHER',
  },
  InvoiceStatus: {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    PAID: 'PAID',
    CLOSED: 'CLOSED',
    CANCELLED: 'CANCELLED',
  },
  InvoiceItemType: {
    CREDIT: 'CREDIT',
    DEBIT: 'DEBIT',
  },
  WeeklyStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  },
}));

vi.mock('../../server/utils/db', () => ({
  safeQuery: vi.fn((cb) => cb()), // Directly execute callback
  prisma: mockPrisma,
}));
