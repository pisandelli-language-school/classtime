import { serverSupabaseUser } from '#supabase/server'
import prisma from '../../../lib/prisma'

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

  try {
    const isAdmin = ['ROOT', 'MANAGER', 'ADMIN'].includes(dbUser.role)
    const query = getQuery(event)
    const teacherId = query.teacherId ? String(query.teacherId) : null

    // We will no longer fetch teachers here. The frontend will fetch them from /api/admin/users (Google Directory)
    // We only fetch the subjects (Assignments = Classes and VIP Students) for the given teacher

    // Determine whose assignments to fetch
    const resolvedTeacherId = isAdmin && teacherId ? teacherId : dbUser.id

    const assignments = await prisma.assignment.findMany({
      where: { teacherId: resolvedTeacherId },
      include: {
        student: { select: { name: true } },
        class: { select: { name: true } }
      }
    })

    const subjects = assignments.map(a => ({
      id: a.id,
      name: a.class?.name || a.student?.name || 'Sem Nome'
    })).sort((a, b) => a.name.localeCompare(b.name))

    return { subjects }
  } catch (error) {
    console.error('Error fetching report filters:', error)
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar filtros.' })
  }
})
