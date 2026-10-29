import { defineConfig, devices } from '@playwright/test';

/**
 * Two production servers from the same build (`npm run test:e2e` builds first):
 *   3200  no Supabase settings: demo, route protection, "not configured" state;
 *   3201  Supabase settings pointing at an address where nothing listens: the
 *         auth forms are enabled, so validation, error handling and forged
 *         session cookies can be exercised without a real backend.
 * Real sign-up/sign-in against Supabase lives in playwright.real.config.ts.
 */
const PORT = 3200;
const AUTH_PORT = 3201;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: [/mobile\.spec\.ts/, /auth-forms\.spec\.ts/],
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
    {
      name: 'auth',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: `http://localhost:${AUTH_PORT}` },
      testMatch: /auth-forms\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/entrar`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_ANON_KEY: '' },
    },
    {
      command: `npx next start -p ${AUTH_PORT}`,
      url: `http://localhost:${AUTH_PORT}/entrar`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        SUPABASE_URL: 'http://127.0.0.1:54399',
        SUPABASE_PUBLISHABLE_KEY: 'e2e-placeholder-key-without-any-access',
        SITE_URL: `http://localhost:${AUTH_PORT}`,
      },
    },
  ],
});
