import { test, expect } from '@playwright/test';

test.describe('ATS Resume Checker Smoke Suite', () => {
  test('Landing page renders properly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Beat the ATS Filters');
    await expect(page.getByRole('link', { name: /Scan Your Resume Free/i })).toBeVisible();
  });

  test('Login page renders sign in and sign up tabs and OAuth button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test('Scorer rejects non-PDF/DOCX file upload', async ({ page }) => {
    await page.goto('/scorer');
    await expect(page.getByRole('heading', { name: /Scan & Optimize Your Resume/i })).toBeVisible();

    // Use setInputFiles directly on the hidden file input
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'malicious_or_bad.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('bad binary data'),
    });

    // Check that error banner appears with specific message
    await expect(page.locator('text=Unsupported file format. Please upload a PDF or DOCX resume.')).toBeVisible();
  });

  test('Resources page displays action verbs and ATS guidelines', async ({ page }) => {
    await page.goto('/resources');
    await expect(page.locator('h1')).toContainText('Resume Optimization Resources');
    await expect(page.locator('text=ATS Formatting: Essential Do')).toBeVisible();
  });
});
