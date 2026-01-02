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
    return await safeQuery(() =>
      prisma.contract.delete({
        where: { id },
      })
    );
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});
