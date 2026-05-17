import { test, expect } from '@playwright/test';

test('app auto-seeds month when system date is first day', async ({ page }) => {
  // Inject a fixed system date (June 1, 2026) before any app script runs.
  await page.addInitScript(() => {
    const Fixed = new Date('2026-06-01T12:00:00');
    const RealDate = Date;

    function MockDate(this: any, ...args: any[]) {
      // If called without args, return the fixed date instance
      if (args.length === 0) {
        return new (RealDate as any)(Fixed);
      }
      return new (RealDate as any)(...args);
    }

    // preserve Date static now()
    (MockDate as any).now = function () {
      return Fixed.getTime();
    };

    // Keep prototype so instance methods like toISOString work
    MockDate.prototype = RealDate.prototype;

    // @ts-ignore
    window.Date = MockDate as any;
  });

  // Ensure no persisted rows exist so auto-seed logic will run.
  await page.addInitScript(() => {
    localStorage.removeItem('app-cham-cong-rows-v1');
  });

  await page.goto('/');
  await page.waitForSelector('main');

  const storageKey = 'app-cham-cong-rows-v1';
  const stored = await page.evaluate((k) => localStorage.getItem(k), storageKey);
  expect(typeof stored === 'string' && JSON.parse(stored || '[]').length > 0).toBeTruthy();

  // pause for 10 seconds to observe the headed browser before closing
  await page.waitForTimeout(10000);
});
