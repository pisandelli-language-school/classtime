export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  // We prefer soft delete (deactivate) or hard delete?
  // Schema has 'active' field. Let's support hard delete for cleanup,
  // but frontend should probably prefer deactivating.
  // For this endpoint, we will implement HARD DELETE,
  // but if there are relations (timesheets), it might fail foreign key constraints.
  // Let's implement active toggle in PUT, and this specific endpoint for hard delete if needed,
  // or catch the error and suggest deactivation.

  try {
    const user = await prisma.user.delete({
      where: { id },
    });
    return user;
  } catch (e: any) {
    if (e.code === 'P2025') {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      });
    }
    if (e.code === 'P2003') {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Cannot delete user with associated data. Deactivate instead.',
      });
    }
    throw e;
  }
});
