import { safeQuery } from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const { totalHours, weeklyHours, startDate, endDate, teacherId } = body;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing contract ID',
    });
  }

  try {
    return await safeQuery(async () => {
      // 1. Update Contract
      // 1. Update Contract
      const contract = await prisma.contract.update({
        where: { id },
        data: {
          totalHours,
          weeklyHours,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
        include: { class: true, student: true },
      });

      // 1b. Update Class Students if applicable
      if (contract.classId && body.studentNames) {
        const studentsToConnect = [];
        for (const sName of body.studentNames) {
          const sTrim = sName.trim();
          if (sTrim) {
            let s = await prisma.student.findFirst({
              where: { name: sTrim },
            });
            if (!s) {
              s = await prisma.student.create({ data: { name: sTrim } });
            }
            studentsToConnect.push({ id: s.id });
          }
        }

        await prisma.class.update({
          where: { id: contract.classId },
          data: {
            students: {
              set: studentsToConnect,
            },
          },
        });
      }

      // 2. Update Teacher Assignment
      if (teacherId) {
        // Prepare Where Clause
        let whereClause = {};
        if (contract.classId) {
          whereClause = { classId: contract.classId };
        } else if (contract.studentId) {
          whereClause = { studentId: contract.studentId };
        }

        if (contract.classId || contract.studentId) {
          // Try Update Many
          const updateResult = await prisma.assignment.updateMany({
            where: whereClause,
            data: { teacherId },
          });

          // If none existed, create one
          if (updateResult.count === 0) {
            await prisma.assignment.create({
              data: {
                teacherId,
                classId: contract.classId || undefined,
                studentId: contract.studentId || undefined,
              },
            });
          }
        }
      }

      return contract;
    });
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});
