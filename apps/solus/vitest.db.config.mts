import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Row Level Security and database-function tests. They run against a real
 * PostgreSQL (see tests/db/support/global-setup.ts), never against mocks.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    globalSetup: ['tests/db/support/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
