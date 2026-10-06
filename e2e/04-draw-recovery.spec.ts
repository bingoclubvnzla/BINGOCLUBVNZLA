import { test, expect } from '@playwright/test';

test.describe('04 - Draw Recovery & F5 Reload', () => {
  test('Retains live draw room structure upon page refresh (F5)', async ({ page }) => {
    await page.goto('/play');

    const roomHeader = page.locator('text=/Sala Oficial de Bingo|Sorteo/i').first();
    await expect(roomHeader).toBeVisible({ timeout: 10000 });

    // Execute F5 reload
    await page.reload();

    // Verify view persists without crashing or losing container
    await expect(roomHeader).toBeVisible({ timeout: 10000 });
  });
});
