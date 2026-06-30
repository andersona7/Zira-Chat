import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  
  test('should redirect unauthenticated users to the login page', async ({ page }) => {
    // Attempt to navigate to the protected home route
    await page.goto('/');
    
    // Validate redirection to /login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h3')).toHaveText('Welcome Back');
  });

  test('should display validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login');
    
    // Click submit without entering data
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Verify Zod validation messages appear
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    
    // Click the "Create one" link
    await page.getByRole('link', { name: /Create one/i }).click();

    // Verify navigation and heading
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.locator('h3')).toHaveText('Create Account');
  });

});