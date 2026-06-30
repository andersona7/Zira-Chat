import { test, expect } from '@playwright/test';

test.describe('End-to-End Chat Workflows', () => {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  const userAUsername = `usera_${randomSuffix}`;
  const userBUsername = `userb_${randomSuffix}`;
  const emailA = `usera_${randomSuffix}@example.com`;
  const emailB = `userb_${randomSuffix}@example.com`;
  const password = 'Password123!';

  test('should register, login, add contact, and send message', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    // 1. Register User B first so they can be added as a contact
    await page.goto('/register');
    await page.getByLabel('Email Address').fill(emailB);
    await page.getByRole('button', { name: /Send Verification Code/i }).click();

    // Verify OTP input appears and verify with development bypass code '123456'
    await expect(page.getByLabel('Enter 6-Digit OTP')).toBeVisible();
    await page.getByLabel('Enter 6-Digit OTP').fill('123456');
    await page.getByRole('button', { name: /Verify OTP/i }).click();

    // Fill registration details
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await page.getByLabel('Full Name').fill('Test User B');
    await expect(page.getByLabel('Username')).toBeVisible();
    await page.getByLabel('Username').fill(userBUsername);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.getByRole('button', { name: /Create Account/i }).click();
    
    // Wait for redirection to login page indicating successful registration
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Register User A
    await page.goto('/register');
    await page.getByLabel('Email Address').fill(emailA);
    await page.getByRole('button', { name: /Send Verification Code/i }).click();

    // Verify OTP input appears and verify with '123456'
    await expect(page.getByLabel('Enter 6-Digit OTP')).toBeVisible();
    await page.getByLabel('Enter 6-Digit OTP').fill('123456');
    await page.getByRole('button', { name: /Verify OTP/i }).click();

    // Fill registration details
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await page.getByLabel('Full Name').fill('Test User A');
    await expect(page.getByLabel('Username')).toBeVisible();
    await page.getByLabel('Username').fill(userAUsername);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.getByRole('button', { name: /Create Account/i }).click();
    await expect(page).toHaveURL(/.*\/login/);

    // Login as User A
    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    await page.getByLabel('Username').fill(userAUsername);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    // 3. User A adds User B as contact
    await page.getByRole('button', { name: /New Chat/i }).click();
    await page.getByRole('button', { name: /Add new contact/i }).click();
    await page.getByLabel('Username').fill(userBUsername);
    await page.getByRole('button', { name: /Add Contact/i }).click();

    // 4. Start chat with User B (verify they appear in the contacts list first)
    const userBContact = page.getByRole('button', { name: new RegExp(userBUsername, 'i') });
    await expect(userBContact).toBeVisible();
    await userBContact.click();

    // 5. Send a message to User B
    const messageInput = page.getByPlaceholder('Type a message');
    await expect(messageInput).toBeVisible();
    await messageInput.fill('Hello from User A!');
    await messageInput.press('Enter');

    // Verify message appears in ChatArea
    await expect(page.getByText('Hello from User A!')).toBeVisible();
  });
});

