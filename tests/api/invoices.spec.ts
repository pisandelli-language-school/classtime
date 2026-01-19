import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../mocks/prisma';

// Mock Supabase Auth
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: vi.fn(),
}));
import { serverSupabaseUser } from '#supabase/server';

// Mock Nuxt Globals (Auto-imports)
const readBodyMock = vi.fn();
vi.stubGlobal('defineEventHandler', (handler: any) => handler);
vi.stubGlobal('createError', (err: any) => err);
vi.stubGlobal('readBody', readBodyMock);
vi.stubGlobal('prisma', mockPrisma); // Stub global prisma for auto-imports

describe('API: Invoices Create', () => {
  let createInvoiceHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an invoice successfully', async () => {
    // Dynamically import handler after stubs are set
    const module = await import('../../server/api/admin/invoices/create.post');
    createInvoiceHandler = module.default;

    // 1. Setup Auth Mock
    vi.mocked(serverSupabaseUser).mockResolvedValue({
      email: 'admin@example.com',
    } as any);

    // 2. Setup DB Mocks
    // Admin user check
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'admin-id',
      role: 'ROOT',
    });
    // Teacher check
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'teacher-1',
      hourlyRate: 50,
    });

    // Time Entries Check
    mockPrisma.timeEntry.findMany.mockResolvedValue([
      { date: new Date(2023, 0, 2), duration: 10 },
    ]);

    // Weekly Status Check (Approved)
    mockPrisma.weeklyTimesheetStatus.findUnique.mockResolvedValue({
      status: 'APPROVED',
    });

    // Invoice Creation Mock
    mockPrisma.invoice.create.mockResolvedValue({
      id: 'invoice-123',
      totalAmount: 500,
    });

    // 3. Setup Request Body
    readBodyMock.mockResolvedValue({
      teacherId: 'teacher-1',
      month: 1,
      year: 2023,
      items: [],
    });

    // 4. Call Handler
    const response = await createInvoiceHandler({} as any);

    // 5. Assertions
    expect(response.success).toBe(true);
    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: 500,
          status: 'CLOSED',
        }),
      }),
    );
  });

  it('should reject if user is not admin', async () => {
    const module = await import('../../server/api/admin/invoices/create.post');
    createInvoiceHandler = module.default;

    vi.mocked(serverSupabaseUser).mockResolvedValue({
      email: 'user@example.com',
    } as any);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      role: 'TEACHER',
    });

    await expect(createInvoiceHandler({} as any)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
