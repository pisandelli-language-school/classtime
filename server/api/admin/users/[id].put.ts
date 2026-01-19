import { google } from 'googleapis';
import path from 'path';
import { getGoogleDirectoryService } from '../../../utils/google';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user ID' });
  }

  // 1. Google Auth & Directory API
  const service = getGoogleDirectoryService();

  try {
    // 2. Resolve Google ID to Email
    const googleUser = await service.users.get({
      userKey: id,
      projection: 'basic',
    });

    const email = googleUser.data.primaryEmail;

    if (!email) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User email not found in Google Workspace',
      });
    }

    const { hourlyRate, monthlyExpectedHours } = body;

    // 3. Upsert Local DB User
    // Note: monthlyExpectedHours is not currently in the User schema (it's calculated).
    // If we want to persist it, we need to add it to schema.prisma.
    // For now, we only update hourlyRate.

    const result = await safeQuery(() =>
      prisma.user.upsert({
        where: { email: email },
        update: {
          hourlyRate: hourlyRate,
          // monthlyExpectedHours: monthlyExpectedHours // TODO: Add to schema if needed
        },
        create: {
          email: email,
          name: googleUser.data.name?.fullName || email,
          role: 'TEACHER', // Default for new DB records
          hourlyRate: hourlyRate,
        },
      }),
    );

    return { success: true, user: result };
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});
