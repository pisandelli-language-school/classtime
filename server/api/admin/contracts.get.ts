import { safeQuery } from '../../utils/db';

export default defineEventHandler(async (event) => {
  try {
    // Fetch Active Contracts
    // We want to list all contracts that are ACTIVE.
    // Also include Class/Student details.

    const contracts = await safeQuery(() =>
      prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          class: {
            include: {
              assignments: { include: { timeEntries: true, teacher: true } },
              students: true,
            },
          },
          student: {
            include: {
              assignments: { include: { timeEntries: true, teacher: true } },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    );

    // Transform Data for UI
    // We need to calculate "Consumed Hours" to show the heat scale.
    // Consumed Hours = Sum of duration of timeEntries linked to assignments of this Class/Student.

    const result = contracts.map((c) => {
      let subjectName = 'Desconhecido';
      let type = 'Indefinido';
      let timeEntries: any[] = [];
      let assignments: any[] = [];

      if (c.class) {
        subjectName = c.class.name;
        type = 'Turma';
        assignments = c.class.assignments;
      } else if (c.student) {
        subjectName = c.student.name;
        type = 'Aluno';
        assignments = c.student.assignments;
      }

      // Aggregate Time Entries from all assignments related to this entity
      // Note: This logic assumes assignments are the link.
      // If a Student has a contract, we look at ALL their assignments?
      // Yes, usually a student's hours are consumed by any class/lesson they take.
      // But wait: Assignments link Student AND Class.
      // If I have a Class Contract, I care about entries for that Class.
      // If I have a Student Contract (Private Class?), I care about entries for that Student.

      assignments.forEach((a) => {
        if (a.timeEntries) {
          timeEntries.push(...a.timeEntries);
        }
      });

      // Filter entries by Contract Date Range?
      // "Consumed Hours" should probably be within the contract period.
      // If I have a renewed contract starting Jan 1st, I shouldn't count Dec 31st entries.
      const start = new Date(c.startDate);
      const consumedMinutes = timeEntries.reduce((acc, entry) => {
        const entryDate = new Date(entry.date);
        // Only count if after contract start.
        // End date might be null (open ended) or set.
        if (entryDate >= start) {
          // We might also check end date if it was a fixed past contract, but we are listing ACTIVE ones.
          // However, if we renew, the old one is archived.
          // So for the ACTIVE one, we count everything from startDate onwards.
          return acc + Number(entry.duration) * 60;
        }
        return acc;
      }, 0);

      const consumedHours = consumedMinutes / 60;
      const totalHours = Number(c.totalHours);

      // Calculate Predicted End Date
      // Formula: Start + (Total / Weekly) weeks
      let predictedEnd = null;
      if (Number(c.weeklyHours) > 0) {
        const weeksDuration = totalHours / Number(c.weeklyHours);
        const daysDuration = weeksDuration * 7;
        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + daysDuration);
        predictedEnd = endDate.toISOString();
      }

      return {
        id: c.id,
        classId: c.classId,
        studentId: c.studentId,
        subjectName,
        type,
        totalHours,
        weeklyHours: Number(c.weeklyHours),
        consumedHours,
        remainingHours: totalHours - consumedHours,
        progress: (consumedHours / totalHours) * 100,
        startDate: c.startDate,
        predictedEndDate: predictedEnd,
        status: c.status,
        teacher: assignments?.[0]?.teacher
          ? {
              id: assignments[0].teacher.id,
              name: assignments[0].teacher.name || assignments[0].teacher.email,
              email: assignments[0].teacher.email,
            }
          : null,
        students: c.class?.students || [],
      };
    });

    return { success: true, contracts: result };
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});
