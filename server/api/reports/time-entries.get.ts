import { serverSupabaseUser } from '#supabase/server'
import prisma from '../../../lib/prisma'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, role: true }
  })

  if (!dbUser) {
    throw createError({ statusCode: 401, statusMessage: 'Usuário não encontrado.' })
  }

  const query = getQuery(event)
  
  const schema = z.object({
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number().min(2000).max(2100),
    teacherId: z.string().optional(),
    subjectId: z.string().optional()
  })

  const parsed = schema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros inválidos.' })
  }

  const { month, year, teacherId, subjectId } = parsed.data

  // RBAC for teacherId
  let targetTeacherId = teacherId
  if (dbUser.role === 'TEACHER') {
    // Teachers can only see their own timesheets
    targetTeacherId = dbUser.id
  }

  // Build the nested where clause
  const whereClause: any = {
    timesheetPeriod: {
      month,
      year
    }
  }

  // If a teacher constraint is applied
  if (targetTeacherId) {
    whereClause.timesheetPeriod.userId = targetTeacherId
  }

  // If a specific assignment (class or student) is applied
  if (subjectId) {
    whereClause.assignmentId = subjectId
  }

  try {
    const entries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        attendees: {
          select: {
            id: true,
            name: true
          }
        },
        timesheetPeriod: {
          select: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    return { data: entries }
  } catch (error) {
    console.error('Error fetching time entries:', error)
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar relatórios.' })
  }
})
