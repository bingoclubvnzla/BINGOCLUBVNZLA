import { test, expect } from '@playwright/test';

test.describe('01 - Production Health & Headers', () => {
  test('Serves 200 OK and loads application root with CSP and titles', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Title verification
    await expect(page).toHaveTitle(/Bingo Club Venezuela/i);

    // Header validations
    const headers = response?.headers();
    expect(headers?.['content-security-policy']).toBeDefined();
    expect(headers?.['content-security-policy']).toContain('challenges.cloudflare.com');
    expect(headers?.['content-security-policy']).toContain('supabase.co');

    // Root mounted
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});
