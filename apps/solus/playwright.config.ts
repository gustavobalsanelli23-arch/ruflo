import { defineConfig, devices } from '@playwright/test';

/**
 * Two production servers from the same build (`npm run test:e2e` builds first):
 *   3200  no Supabase settings: demo, route protection, "not configured" state;
 *   3201  Supabase settings pointing at an address where nothing listens: the
 *         auth forms are enabled, so validation, error handling and forged
 *         session cookies can be exercised without a real backend.
 *   3202  the demo AI switched on with a placeholder key (never called): the
 *         analyst, which only exists where the AI is configured.
 * Real sign-up/sign-in against Supabase lives in playwright.real.config.ts.
 */
const PORT = 3200;
const AUTH_PORT = 3201;
const AI_PORT = 3202;

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
      testIgnore: [/mobile\.spec\.ts/, /auth-forms\.spec\.ts/, /analyst\.spec\.ts/],
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
    {
      name: 'auth',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: `http://localhost:${AUTH_PORT}` },
      testMatch: /auth-forms\.spec\.ts/,
    },
    {
      name: 'analyst',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${AI_PORT}` },
      testMatch: /analyst\.spec\.ts/,
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
    {
      command: `npx next start -p ${AI_PORT}`,
      url: `http://localhost:${AI_PORT}/entrar`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        SUPABASE_URL: '',
        SUPABASE_PUBLISHABLE_KEY: '',
        SUPABASE_ANON_KEY: '',
        ANTHROPIC_API_KEY: 'e2e-placeholder-never-called',
        SOLUS_DEMO_AI: 'on',
        SOLUS_DEMO_AI_CODE: 'codigo-de-teste-e2e',
      },
    },
  ],
});
