import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../mocks/prisma';
import { serverSupabaseUser } from '#supabase/server';

// Mock Supabase Auth explicitly (Factory Pattern)
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: vi.fn(),
}));

// Mock Nuxt H3 utilities
const readBodyMock = vi.fn();
vi.stubGlobal('readBody', readBodyMock);
vi.stubGlobal('defineEventHandler', (handler: any) => handler);
vi.stubGlobal('createError', (err: any) => err);
vi.stubGlobal('prisma', mockPrisma);

describe('API: Approvals Action', () => {
  let handler: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const loadHandler = async () => {
    const module = await import('../../server/api/admin/approvals/action.post');
    return module.default;
  };

  it('should approve a timesheet', async () => {
    handler = await loadHandler();

    vi.mocked(serverSupabaseUser).mockResolvedValue({
      email: 'admin@example.com',
    } as any);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-id',
      role: 'MANAGER',
    });
    mockPrisma.weeklyTimesheetStatus.upsert.mockResolvedValue({
      status: 'APPROVED',
    });

    readBodyMock.mockResolvedValue({
      teacherId: 'teacher-1',
      date: '2023-01-02',
      action: 'APPROVE',
    });

    const response = await handler({} as any);

    expect(response.success).toBe(true);
    expect(mockPrisma.weeklyTimesheetStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
  });

  it('should reject a timesheet with reason', async () => {
    handler = await loadHandler();

    vi.mocked(serverSupabaseUser).mockResolvedValue({
      email: 'admin@example.com',
    } as any);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-id',
      role: 'MANAGER',
    });

    readBodyMock.mockResolvedValue({
      teacherId: 'teacher-1',
      date: '2023-01-02',
      action: 'REJECT',
      reason: 'Incomplete',
    });

    await handler({} as any);

    expect(mockPrisma.weeklyTimesheetStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'Incomplete',
        }),
      }),
    );
  });

  it('should fail rejection without reason', async () => {
    handler = await loadHandler();

    vi.mocked(serverSupabaseUser).mockResolvedValue({
      email: 'admin@example.com',
    } as any);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-id',
      role: 'MANAGER',
    });

    readBodyMock.mockResolvedValue({
      teacherId: 'teacher-1',
      date: '2023-01-02',
      action: 'REJECT',
    });

    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('should reopen only if root', async () => {
    handler = await loadHandler();

    // Attempt as Manager (Should Fail)
    vi.mocked(serverSupabaseUser).mockResolvedValue({
      email: 'manager@example.com',
    } as any);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'manager-id',
      role: 'MANAGER',
    });
    readBodyMock.mockResolvedValue({
      teacherId: 'teacher-1',
      date: '2023-01-02',
      action: 'REOPEN',
    });

    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 403 });

    // Attempt as Root (Should Pass)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'root-id',
      role: 'ROOT',
    });
    await handler({} as any);

    expect(mockPrisma.weeklyTimesheetStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
  });
});
