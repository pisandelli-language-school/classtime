import { fileURLToPath } from 'node:url';
import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    globals: true,
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_KEY: 'example-key',
    },
  },
  resolve: {
    alias: {
      '#supabase/server': fileURLToPath(
        new URL('./tests/mocks/supabase.ts', import.meta.url),
      ),
    },
  },
});
