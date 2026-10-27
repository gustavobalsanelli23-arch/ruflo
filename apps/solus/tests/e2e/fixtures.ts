import { test as base, expect } from '@playwright/test';

/** Fails a test on any console error or uncaught page error. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await provide(errors);
    expect(errors, 'erros no console').toEqual([]);
  },
});

export { expect };
