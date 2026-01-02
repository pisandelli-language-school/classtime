import { safeQuery } from '../../utils/db';

export default defineEventHandler(async (event) => {
  try {
    const [classes, students] = await Promise.all([
      safeQuery(() =>
        prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      ),
      safeQuery(() =>
        prisma.student.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      ),
    ]);

    const entities = [
      ...classes.map((c) => ({
        id: c.id,
        name: c.name,
        type: 'Turma',
        value: { classId: c.id },
      })),
      ...students.map((s) => ({
        id: s.id,
        name: s.name,
        type: 'Aluno',
        value: { studentId: s.id },
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, entities };
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});
