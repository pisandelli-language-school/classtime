import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['ROOT', 'MANAGER', 'TEACHER']),
  hourlyRate: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.issues,
    });
  }

  const { email, name, role, hourlyRate, active } = result.data;

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        hourlyRate: hourlyRate ?? 0,
        active: active ?? true,
      },
    });
    return user;
  } catch (e: any) {
    if (e.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Email already exists',
      });
    }
    throw e;
  }
});
