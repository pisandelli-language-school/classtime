import { safeQuery } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const {
    classId,
    studentId,
    name,
    type,
    totalHours,
    weeklyHours,
    startDate,
    endDate,
  } = body;

  // Validation: Must have either ID (Renew/Existing) OR Name+Type (New Entity)
  if (!classId && !studentId && (!name || !type)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Must provide either Entity ID or Name+Type',
    });
  }

  try {
    return await safeQuery(async () => {
      // 1. Transaction
      return prisma.$transaction(async (tx) => {
        let finalClassId = classId;
        let finalStudentId = studentId;

        // A. Create New Entity if needed
        if (!finalClassId && !finalStudentId && name && type) {
          if (type === 'Turma') {
            const newClass = await tx.class.create({ data: { name } });
            finalClassId = newClass.id;
          } else {
            // Type = Aluno/VIP
            const newStudent = await tx.student.create({ data: { name } });
            finalStudentId = newStudent.id;
          }
        }

        // B. Check for existing active contract (Renewal)
        const whereClause = finalClassId
          ? { classId: finalClassId, status: 'ACTIVE' }
          : { studentId: finalStudentId, status: 'ACTIVE' };

        const existing = await tx.contract.findFirst({
          where: whereClause as any,
        });

        if (existing) {
          await tx.contract.update({
            where: { id: existing.id },
            data: { status: 'ARCHIVED' },
          });
        }

        // C. Create New Contract
        const newContract = await tx.contract.create({
          data: {
            classId: finalClassId || undefined,
            studentId: finalStudentId || undefined,
            totalHours,
            weeklyHours,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            status: 'ACTIVE',
          },
        });

        // D. Create Assignment (Teacher Association)
        const teacherId = body.teacherId;
        if (teacherId) {
          await tx.assignment.create({
            data: {
              teacherId: teacherId,
              classId: finalClassId || undefined,
              studentId: finalStudentId || undefined,
            },
          });
        }

        return { success: true, contract: newContract };
      });
    });
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});
