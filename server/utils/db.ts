import { Prisma } from '@prisma/client';

export const safeQuery = async <T>(
  operation: () => Promise<T>,
  retries = 2,
  delay = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Supabase/Prisma Connection Errors
    // XX000: Tenant or user not found (Common in Supabase pooling when idle)
    // P1001: Can't reach database server
    // P1008: Operations timed out
    // P1017: Server closed the connection
    const isRetryable =
      error.code === 'XX000' ||
      error.message?.includes('Tenant or user not found') ||
      error.code === 'P1001' ||
      error.code === 'P1008' ||
      error.code === 'P1017';

    if (isRetryable && retries > 0) {
      console.warn(
        `[DB Retry] Encountered error ${
          error.code || error.message
        }. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return safeQuery(operation, retries - 1, delay * 1.5);
    }

    throw error;
  }
};
