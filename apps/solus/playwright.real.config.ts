import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end against a REAL Supabase test project (never production):
 * sign-up, e-mail confirmation, sign-in, organizations, invitations, roles,
 * password recovery and sign-out. Skipped unless these are set:
 *
 *   SOLUS_E2E_BASE_URL               the app, already running and connected to the test project
 *   SOLUS_E2E_SUPABASE_URL           the test project's URL
 *   SOLUS_E2E_SUPABASE_SECRET_KEY    its secret key (creates confirmation links and cleans up)
 *
 * Links are generated with the Auth admin API, so no inbox is needed.
 */
export default defineConfig({
  testDir: 'tests/e2e-real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.SOLUS_E2E_BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
});
