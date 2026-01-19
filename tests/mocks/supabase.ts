import { vi } from 'vitest';

export const serverSupabaseUser = vi.fn().mockResolvedValue(null);

export const serverSupabaseClient = vi.fn().mockReturnValue({
  from: () => ({ select: () => ({ data: [], error: null }) }),
});
