import { serverSupabaseUser } from '#supabase/server';
import { safeQuery } from '../../../utils/db';
import { Role } from '@prisma/client';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user || !user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Admin/Manager Check
  const currentUser = await safeQuery(() =>
    prisma.user.findUnique({ where: { email: user.email } })
  );

  if (
    !currentUser ||
    (currentUser.role !== Role.ROOT &&
      currentUser.role !== Role.MANAGER &&
      currentUser.id !== event.context.params?.id) // Allow self? No, this is admin endpoint.
  ) {
    // If not admin/manager, check if the invoice belongs to the user?
    // For now, let's keep it simple: Admin/Manager only.
    if (currentUser.role !== Role.ROOT && currentUser.role !== Role.MANAGER) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    }
  }

  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' });

  const invoice = await safeQuery(() =>
    prisma.invoice.findUnique({
      where: { id },
      include: {
        teacher: true,
        items: true,
      },
    })
  );

  if (!invoice)
    throw createError({ statusCode: 404, statusMessage: 'Invoice not found' });

  return invoice;
});
