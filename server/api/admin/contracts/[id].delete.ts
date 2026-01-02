import { safeQuery } from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing contract ID',
    });
  }

  try {
    return await safeQuery(async () => {
      return prisma.$transaction(async (tx) => {
        // 1. Get Contract to find linked identities
        const contract = await tx.contract.findUnique({
          where: { id },
          select: { classId: true, studentId: true },
        });

        if (!contract) return null;

        // 2. Delete linked Assignments (Clean up Teacher view)
        // If we don't do this, the teacher still sees the "Student" in their list without a contract.
        if (contract.classId) {
          await tx.assignment.deleteMany({
            where: { classId: contract.classId },
          });
        } else if (contract.studentId) {
          await tx.assignment.deleteMany({
            where: { studentId: contract.studentId },
          });
        }

        // 3. Delete Contract
        return tx.contract.delete({
          where: { id },
        });
      });
    });
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});
