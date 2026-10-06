import { test, expect } from '@playwright/test';

test.describe('05 - Security Boundaries & RBAC Locks', () => {
  test('Unauthenticated access to /admin is blocked by login gate', async ({ page }) => {
    await page.goto('/admin');

    // Expect login requirement or redirection
    const lockText = page.locator('text=/Inicio de Sesión Requerido|Acceso Denegado|INICIAR SESIÓN/i').first();
    await expect(lockText).toBeVisible({ timeout: 10000 });
  });

  test('Unauthenticated access to /super-admin is blocked by lock shield', async ({ page }) => {
    await page.goto('/super-admin');

    const lockNotice = page.locator('text=/Inicio de Sesión Requerido|Panel de Administración/i').first();
    await expect(lockNotice).toBeVisible({ timeout: 10000 });
  });
});
