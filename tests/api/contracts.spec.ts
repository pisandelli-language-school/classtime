import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../mocks/prisma';
import { serverSupabaseUser } from '#supabase/server';

// Mock Supabase Auth explicitly
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: vi.fn(),
}));

// Mock Nuxt H3 utilities
const readBodyMock = vi.fn();
const getRouterParamMock = vi.fn();
vi.stubGlobal('readBody', readBodyMock);
vi.stubGlobal('getRouterParam', getRouterParamMock);
vi.stubGlobal('defineEventHandler', (handler: any) => handler);
vi.stubGlobal('createError', (err: any) => err);
vi.stubGlobal('prisma', mockPrisma);

describe('API: Contracts Logic', () => {
  let postHandler: any;
  let putHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const loadPostHandler = async () => {
    const module = await import('../../server/api/admin/contracts.post');
    return module.default;
  };

  const loadPutHandler = async () => {
    const module = await import('../../server/api/admin/contracts/[id].put');
    return module.default;
  };

  describe('POST /api/admin/contracts', () => {
    it('should create a contract with an existing teacher', async () => {
      postHandler = await loadPostHandler();

      // Mocks
      vi.mocked(serverSupabaseUser).mockResolvedValue({
        email: 'admin@example.com',
      } as any);

      // Request Body
      readBodyMock.mockResolvedValue({
        name: 'New Class',
        type: 'Turma',
        totalHours: 40,
        weeklyHours: 2,
        startDate: '2023-01-01',
        teacherEmail: 'teacher@example.com',
        teacherName: 'Teacher Name',
        studentNames: ['Student A', 'Student B'],
      });

      // Prisma Mocks
      // 1. Transaction simulation (simple pass-through for mock)
      mockPrisma.$transaction.mockImplementation((callback) =>
        callback(mockPrisma),
      );

      // 2. Find Student (mock missing to trigger create)
      mockPrisma.student.findFirst.mockResolvedValue(null);
      mockPrisma.student.create.mockResolvedValue({ id: 'student-id' });

      // 3. Create Class
      mockPrisma.class.create.mockResolvedValue({ id: 'class-id' });

      // 4. Find Existing Contract
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      // 5. Create Contract
      mockPrisma.contract.create.mockResolvedValue({ id: 'contract-id' });

      // 6. Find Teacher (Existing)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'teacher-id',
        email: 'teacher@example.com',
      });

      // Execute
      await postHandler({} as any);

      // Verify Teacher Lookup
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'teacher@example.com' },
      });

      // Verify Assignment Creation
      expect(mockPrisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teacherId: 'teacher-id',
            classId: 'class-id',
          }),
        }),
      );
    });

    it('should create a contract and create a NEW teacher if not found', async () => {
      postHandler = await loadPostHandler();

      // Request Body
      readBodyMock.mockResolvedValue({
        name: 'VIP Class',
        type: 'Aluno',
        totalHours: 20,
        weeklyHours: 1,
        startDate: '2023-01-01',
        teacherEmail: 'newteacher@example.com',
        teacherName: 'New Teacher',
      });

      mockPrisma.$transaction.mockImplementation((callback) =>
        callback(mockPrisma),
      );

      // VIP flow: Create Student
      mockPrisma.student.create.mockResolvedValue({ id: 'vip-student-id' });

      mockPrisma.contract.findFirst.mockResolvedValue(null);
      mockPrisma.contract.create.mockResolvedValue({ id: 'contract-id' });

      // Teacher Lookup (Not Found)
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Teacher Create
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-teacher-id',
        email: 'newteacher@example.com',
      });

      // Execute
      await postHandler({} as any);

      // Verify Teacher Creation
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newteacher@example.com',
            name: 'New Teacher',
            role: 'TEACHER',
          }),
        }),
      );

      // Verify Assignment with new ID
      expect(mockPrisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teacherId: 'new-teacher-id',
            studentId: 'vip-student-id',
          }),
        }),
      );
    });

    it('should throw error if teacherEmail is missing', async () => {
      postHandler = await loadPostHandler();

      readBodyMock.mockResolvedValue({
        name: 'No Teacher Class',
        type: 'Turma',
        totalHours: 40,
        teacherEmail: undefined, // Missing
      });

      await expect(postHandler({} as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'É necessário informar um Professor Responsável.',
      });
    });
  });

  describe('PUT /api/admin/contracts/[id]', () => {
    it('should update contract and change teacher', async () => {
      putHandler = await loadPutHandler();

      getRouterParamMock.mockReturnValue('contract-id');
      readBodyMock.mockResolvedValue({
        totalHours: 50,
        teacherEmail: 'changed@example.com',
      });

      // Mock Contract Update
      mockPrisma.contract.update.mockResolvedValue({
        id: 'contract-id',
        classId: 'class-id',
        class: { id: 'class-id' },
      });

      // Mock Teacher Lookup (Existing)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'changed-teacher-id',
      });

      // Mock Update Assignment
      mockPrisma.assignment.updateMany.mockResolvedValue({ count: 1 });

      await putHandler({} as any);

      expect(mockPrisma.contract.update).toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'changed@example.com' },
      });

      // Verify assignment update
      expect(mockPrisma.assignment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId: 'class-id' },
          data: { teacherId: 'changed-teacher-id' },
        }),
      );
    });

    it('should throw error if teacherEmail is missing on update', async () => {
      putHandler = await loadPutHandler();

      getRouterParamMock.mockReturnValue('contract-id');
      readBodyMock.mockResolvedValue({
        totalHours: 50,
        // teacherEmail missing
      });

      await expect(putHandler({} as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'É necessário informar um Professor Responsável.',
      });
    });
  });
});
