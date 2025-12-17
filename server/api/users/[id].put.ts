import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ROOT', 'MANAGER', 'TEACHER']).optional(),
  hourlyRate: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const result = updateUserSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.issues,
    });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: result.data,
    });
    return user;
  } catch (e: any) {
    if (e.code === 'P2025') {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      });
    }
    throw e;
  }
});
