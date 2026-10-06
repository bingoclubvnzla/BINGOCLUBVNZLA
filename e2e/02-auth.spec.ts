import { test, expect } from '@playwright/test';

test.describe('02 - Authentication & Turnstile Security', () => {
  test('Opens login modal and renders Cloudflare Turnstile anti-bot protection', async ({ page }) => {
    await page.goto('/');

    // Click on Iniciar Sesión / Jugar
    const loginBtn = page.getByRole('button', { name: /iniciar sesión/i }).first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
    } else {
      await page.goto('/login');
    }

    // Modal is visible
    const modalHeading = page.locator('text=Iniciar Sesión').first();
    await expect(modalHeading).toBeVisible();

    // Turnstile notice / container is attached in the modal DOM
    const turnstileNotice = page.locator('text=/protección anti-bot Turnstile|Turnstile/i').first();
    await expect(turnstileNotice).toBeVisible();

    // Email/password inputs are present
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Form submit button is present
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });
});
