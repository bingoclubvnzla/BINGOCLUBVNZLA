import { test, expect } from '@playwright/test';

test.describe('03 - Live Play & Realtime Indicators', () => {
  test('Navigates to live play room and displays room status', async ({ page }) => {
    await page.goto('/play');

    // Wait for the room or header to render
    const roomHeader = page.locator('text=/Sala Oficial de Bingo|Sorteo/i').first();
    await expect(roomHeader).toBeVisible({ timeout: 10000 });

    // Verify clock and connection indicators exist
    const clockOrStatus = page.locator('text=/UTC|EN_VIVO|SINCRONIZANDO/i').first();
    await expect(clockOrStatus).toBeVisible();
  });
});
