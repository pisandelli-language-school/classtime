import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../mocks/prisma';
import { serverSupabaseUser } from '#supabase/server';

// Mock Supabase Auth explicitly
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: vi.fn(),
}));

// Mock Nuxt H3 utilities
const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);
vi.stubGlobal('defineEventHandler', (handler: any) => handler);
vi.stubGlobal('createError', (err: any) => err);
vi.stubGlobal('prisma', mockPrisma);

describe('API: Reports Logic', () => {
  let timeEntriesHandler: any;
  let filtersHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const loadTimeEntriesHandler = async () => {
    const module = await import('../../server/api/reports/time-entries.get');
    return module.default;
  };

  const loadFiltersHandler = async () => {
    const module = await import('../../server/api/reports/filters.get');
    return module.default;
  };

  describe('GET /api/reports/time-entries', () => {
    it('should allow ADMIN to fetch records for a specific teacher', async () => {
      timeEntriesHandler = await loadTimeEntriesHandler();

      // Mocks
      vi.mocked(serverSupabaseUser).mockResolvedValue({ email: 'admin@test.com' } as any);
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-id',
        role: 'ADMIN',
      });

      getQueryMock.mockReturnValue({ month: '4', year: '2025', teacherId: 'teacher-id' });

      mockPrisma.timeEntry.findMany.mockResolvedValue([{ id: 'mock-entry' }]);

      const res = await timeEntriesHandler({} as any);

      expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timesheetPeriod: {
              month: 4,
              year: 2025,
              userId: 'teacher-id'
            }
          }
        })
      );
      expect(res.data).toHaveLength(1);
    });

    it('should force TEACHER to only query their own records', async () => {
      timeEntriesHandler = await loadTimeEntriesHandler();

      // Mocks
      vi.mocked(serverSupabaseUser).mockResolvedValue({ email: 'teacher@test.com' } as any);
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'logged-in-teacher',
        role: 'TEACHER',
      });

      // Teacher maliciously tries to request someone else's ID
      getQueryMock.mockReturnValue({ month: '4', year: '2025', teacherId: 'other-id' });

      mockPrisma.timeEntry.findMany.mockResolvedValue([]);

      await timeEntriesHandler({} as any);

      // Verify that RBAC overrode targetTeacherId to 'logged-in-teacher'
      expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timesheetPeriod: {
              month: 4,
              year: 2025,
              userId: 'logged-in-teacher'
            }
          }
        })
      );
    });
    
    it('should correctly build query for subject filter', async () => {
        timeEntriesHandler = await loadTimeEntriesHandler();
        
        vi.mocked(serverSupabaseUser).mockResolvedValue({ email: 'teacher@test.com' } as any);
      
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 'teacher-id',
            role: 'TEACHER',
        });

        getQueryMock.mockReturnValue({ month: '4', year: '2025', subjectId: 'class-assignment-id' });
        
        mockPrisma.timeEntry.findMany.mockResolvedValue([]);
        
        await timeEntriesHandler({} as any);
        
        expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
            where: {
                timesheetPeriod: {
                    month: 4,
                    year: 2025,
                    userId: 'teacher-id'
                },
                assignmentId: 'class-assignment-id'
            }
            })
        );
    });
  });

  describe('GET /api/reports/filters', () => {
      it('should return subjects based on teacher assignments', async () => {
          filtersHandler = await loadFiltersHandler();
          
          vi.mocked(serverSupabaseUser).mockResolvedValue({ email: 'admin@test.com' } as any);
          mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-id', role: 'ADMIN' });
          getQueryMock.mockReturnValue({ teacherId: 'some-teacher' });
          
          mockPrisma.assignment.findMany.mockResolvedValue([
            { id: 'a1', class: { name: 'Class 1' } }, 
            { id: 'a2', student: { name: 'Student 1' } }
          ]);
          
          const result = await filtersHandler({} as any);
          
          expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
            where: { teacherId: 'some-teacher' },
            include: {
              student: { select: { name: true } },
              class: { select: { name: true } }
            }
          });
          expect(result.subjects).toHaveLength(2);
          // Tests sorting logic as well
          expect(result.subjects[0].name).toBe('Class 1');
          expect(result.subjects[1].name).toBe('Student 1');
      });
      
      it('should default to logged in user if not admin', async () => {
        filtersHandler = await loadFiltersHandler();
        
        vi.mocked(serverSupabaseUser).mockResolvedValue({ email: 'teacher@test.com' } as any);
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'teacher-id', role: 'TEACHER' });
        getQueryMock.mockReturnValue({ teacherId: 'other-teacher' }); // Malicious target
        
        mockPrisma.assignment.findMany.mockResolvedValue([]);
        
        await filtersHandler({} as any);
        
        expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
          where: { teacherId: 'teacher-id' },
          include: {
            student: { select: { name: true } },
            class: { select: { name: true } }
          }
        });
      });
  })
});
