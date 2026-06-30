import { test, expect } from '@playwright/test';

test.describe('Zira Chat Comprehensive E2E Journey', () => {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Test User Configuration
  const userA = {
    fullName: 'John Anderson',
    username: `john123_${randomSuffix}`,
    email: `john_${randomSuffix}@example.com`,
    password: 'Password123!',
  };

  const userB = {
    fullName: 'David Kumar',
    username: `david456_${randomSuffix}`,
    email: `david_${randomSuffix}@example.com`,
    password: 'Password123!',
  };

  const userC = {
    fullName: 'Sarah Wilson',
    username: `sarah789_${randomSuffix}`,
    email: `sarah_${randomSuffix}@example.com`,
    password: 'Password123!',
  };

  test('Execute full multi-user journey from Registration to Blocking', async ({ browser }) => {
    test.setTimeout(120000);
    // -------------------------------------------------------------
    // PHASE 1: REGISTRATION & VALIDATIONS
    // -------------------------------------------------------------
    const contextOptions = {
      permissions: ['microphone', 'camera'] as any[],
    };
    const contextA = await browser.newContext(contextOptions);
    const pageA = await contextA.newPage();

    // 1. Duplicate email prevention test
    await pageA.goto('/register');
    await pageA.getByLabel('Email Address').fill(userA.email);
    await pageA.getByRole('button', { name: /Send Verification Code/i }).click();
    await expect(pageA.getByLabel('Enter 6-Digit OTP')).toBeVisible();
    await pageA.getByLabel('Enter 6-Digit OTP').fill('123456');
    await pageA.getByRole('button', { name: /Verify OTP/i }).click();

    await pageA.getByLabel('Full Name').fill(userA.fullName);
    await pageA.getByLabel('Username').fill(userA.username);
    await pageA.locator('input[name="password"]').fill(userA.password);
    await pageA.locator('input[name="confirmPassword"]').fill(userA.password);
    await pageA.getByRole('button', { name: /Create Account/i }).click();
    await expect(pageA).toHaveURL(/.*\/login/);

    // Try to register again with same email
    await pageA.goto('/register');
    await pageA.getByLabel('Email Address').fill(userA.email);
    await pageA.getByRole('button', { name: /Send Verification Code/i }).click();
    await expect(pageA.getByText('Email already registered')).toBeVisible();

    // 2. Duplicate username prevention test
    const tempEmail = `temp_${randomSuffix}@example.com`;
    await pageA.goto('/register');
    await pageA.getByLabel('Email Address').fill(tempEmail);
    await pageA.getByRole('button', { name: /Send Verification Code/i }).click();
    await expect(pageA.getByLabel('Enter 6-Digit OTP')).toBeVisible();
    await pageA.getByLabel('Enter 6-Digit OTP').fill('123456');
    await pageA.getByRole('button', { name: /Verify OTP/i }).click();

    await pageA.getByLabel('Full Name').fill('Temp User');
    await pageA.getByLabel('Username').fill(userA.username); // duplicate username
    await pageA.locator('input[name="password"]').fill(userA.password);
    await pageA.locator('input[name="confirmPassword"]').fill(userA.password);
    await pageA.getByRole('button', { name: /Create Account/i }).click();
    await expect(pageA.getByText('Username is already taken')).toBeVisible();

    // Register User B
    const contextB = await browser.newContext(contextOptions);
    const pageB = await contextB.newPage();
    await pageB.goto('/register');
    await pageB.getByLabel('Email Address').fill(userB.email);
    await pageB.getByRole('button', { name: /Send Verification Code/i }).click();
    await expect(pageB.getByLabel('Enter 6-Digit OTP')).toBeVisible();
    await pageB.getByLabel('Enter 6-Digit OTP').fill('123456');
    await pageB.getByRole('button', { name: /Verify OTP/i }).click();

    await pageB.getByLabel('Full Name').fill(userB.fullName);
    await pageB.getByLabel('Username').fill(userB.username);
    await pageB.locator('input[name="password"]').fill(userB.password);
    await pageB.locator('input[name="confirmPassword"]').fill(userB.password);
    await pageB.getByRole('button', { name: /Create Account/i }).click();
    await expect(pageB).toHaveURL(/.*\/login/);

    // Register User C
    const contextC = await browser.newContext(contextOptions);
    const pageC = await contextC.newPage();
    await pageC.goto('/register');
    await pageC.getByLabel('Email Address').fill(userC.email);
    await pageC.getByRole('button', { name: /Send Verification Code/i }).click();
    await expect(pageC.getByLabel('Enter 6-Digit OTP')).toBeVisible();
    await pageC.getByLabel('Enter 6-Digit OTP').fill('123456');
    await pageC.getByRole('button', { name: /Verify OTP/i }).click();

    await pageC.getByLabel('Full Name').fill(userC.fullName);
    await pageC.getByLabel('Username').fill(userC.username);
    await pageC.locator('input[name="password"]').fill(userC.password);
    await pageC.locator('input[name="confirmPassword"]').fill(userC.password);
    await pageC.getByRole('button', { name: /Create Account/i }).click();
    await expect(pageC).toHaveURL(/.*\/login/);

    // -------------------------------------------------------------
    // PHASE 2: LOGIN & SESSION PERSISTENCE
    // -------------------------------------------------------------
    // Test invalid credentials
    await pageA.goto('/login');
    await pageA.getByLabel('Username').fill(userA.username);
    await pageA.locator('input[name="password"]').fill('WrongPassword123');
    await pageA.getByRole('button', { name: /Sign In/i }).click();
    await expect(pageA.getByText('Invalid username or password')).toBeVisible();

    // Test valid credentials
    await pageA.getByLabel('Username').fill(userA.username);
    await pageA.locator('input[name="password"]').fill(userA.password);
    await pageA.getByRole('button', { name: /Sign In/i }).click();
    await expect(pageA).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    // Test session persistence by reloading page
    await pageA.reload();
    await expect(pageA).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    // Log in User B and User C
    await pageB.goto('/login');
    await pageB.getByLabel('Username').fill(userB.username);
    await pageB.locator('input[name="password"]').fill(userB.password);
    await pageB.getByRole('button', { name: /Sign In/i }).click();
    await expect(pageB).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    await pageC.goto('/login');
    await pageC.getByLabel('Username').fill(userC.username);
    await pageC.locator('input[name="password"]').fill(userC.password);
    await pageC.getByRole('button', { name: /Sign In/i }).click();
    await expect(pageC).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    // -------------------------------------------------------------
    // PHASE 3: PROFILE UPDATES
    // -------------------------------------------------------------
    // Open Profile Panel on User A by clicking initials
    await pageA.getByText('JA').click();
    await expect(pageA.getByText('Profile', { exact: true })).toBeVisible();
    await pageA.getByRole('button', { name: 'Edit name' }).click();
    const nameInput = pageA.locator('.space-y-2:has-text("Your Name") input');
    await nameInput.fill('John Anderson Updated');
    await nameInput.press('Enter');
    await expect(pageA.getByRole('button', { name: 'Save name' })).not.toBeVisible();
    await expect(pageA.getByText('John Anderson Updated')).toBeVisible();
    await pageA.getByRole('button', { name: 'Back' }).click();
    await expect(pageA.getByText('Profile', { exact: true })).not.toBeVisible();

    // -------------------------------------------------------------
    // PHASE 4: CONTACT SYSTEM
    // -------------------------------------------------------------
    // User A adds User B
    await pageA.getByRole('button', { name: /New Chat/i }).click();
    await pageA.getByRole('button', { name: /Add new contact/i }).click();
    await pageA.getByLabel('Username').fill(userB.username);
    await pageA.getByRole('button', { name: /Add Contact/i }).click({ force: true });
    
    // Verify B appears in contact list of A with Full Name, and username is hidden
    const newChatPanelA = pageA.locator('div').filter({ has: pageA.getByRole('heading', { name: 'New Chat', level: 2, exact: true }) });
    const contactCardA = newChatPanelA.getByRole('button').filter({ hasText: userB.fullName });
    await expect(contactCardA).toBeVisible();
    
    // User B adds User A
    await pageB.getByRole('button', { name: /New Chat/i }).click();
    await pageB.getByRole('button', { name: /Add new contact/i }).click();
    await pageB.getByLabel('Username').fill(userA.username);
    await pageB.getByRole('button', { name: /Add Contact/i }).click({ force: true });
    
    const newChatPanelB = pageB.locator('div').filter({ has: pageB.getByRole('heading', { name: 'New Chat', level: 2, exact: true }) });
    const contactCardB = newChatPanelB.getByRole('button').filter({ hasText: /John Anderson/ });
    await expect(contactCardB).toBeVisible();

    // -------------------------------------------------------------
    // PHASE 5 & 6: ONE TO ONE CHAT & MESSAGE STATUS
    // -------------------------------------------------------------
    // Open chat with B on A's screen
    await contactCardA.click();

    // Send a message from A to B
    const msgInputA = pageA.getByPlaceholder('Type a message');
    await msgInputA.fill('Hello David, how are you?');
    await msgInputA.press('Enter');

    // Open chat with A on B's screen after message is sent
    await contactCardB.click();

    // Verify it appears on B's screen and matches
    await expect(pageB.getByRole('main').getByText('Hello David, how are you?')).toBeVisible();

    // Verify message has double ticks or blue ticks (since both are in the chat)
    await expect(pageA.locator('span:has-text("✓✓")').first()).toBeVisible();

    // Test emoji and long message
    await msgInputA.fill('👋 😊');
    await msgInputA.press('Enter');
    await expect(pageB.getByRole('main').getByText('👋 😊')).toBeVisible();

    const longMsg = 'A'.repeat(500);
    await msgInputA.fill(longMsg);
    await msgInputA.press('Enter');
    await expect(pageB.getByRole('main').getByText(longMsg)).toBeVisible();

    // -------------------------------------------------------------
    // PHASE 7: ONLINE STATUS & TYPING INDICATORS
    // -------------------------------------------------------------
    // Verify online status indicator
    await expect(pageA.getByText('Online', { exact: true })).toBeVisible();

    // Verify typing indicator
    await pageB.getByPlaceholder('Type a message').fill('I am typ');
    await expect(pageA.getByText('typing...', { exact: true })).toBeVisible();
    await pageB.getByPlaceholder('Type a message').fill(''); // Clear

    // -------------------------------------------------------------
    // PHASE 8: STATUS FEATURE
    // -------------------------------------------------------------
    // User A creates a status
    await pageA.getByRole('button', { name: /Status/i }).click();
    await pageA.waitForTimeout(500);
    await pageA.getByRole('button', { name: 'Add Status', exact: true }).click();
    await pageA.getByRole('button', { name: /Text/i }).click({ force: true });
    await pageA.locator('textarea').fill('My Awesome Day Status!');
    await pageA.getByRole('button', { name: /Share/i }).click({ force: true });
    await expect(pageA.getByText('Create Status')).not.toBeVisible(); // wait for modal close
    await pageA.getByRole('button', { name: 'Back' }).click();

    // User B views User A's status
    await pageB.getByRole('button', { name: /Status/i }).click();
    await pageB.waitForTimeout(500);
    const statusPanel = pageB.locator('.absolute.inset-0.z-40');
    await expect(statusPanel.getByRole('heading', { level: 4, name: /John Anderson/ })).toBeVisible();
    await statusPanel.getByRole('button', { name: /John Anderson/, exact: false }).click();
    await expect(pageB.getByText('My Awesome Day Status!')).toBeVisible();
    // Close status viewer
    await pageB.getByRole('button', { name: 'Back' }).click();

    // -------------------------------------------------------------
    // PHASE 9: GROUP CHAT
    // -------------------------------------------------------------
    // User A adds User C as contact first to include in group
    await pageA.getByRole('button', { name: /New Chat/i }).click();
    await pageA.getByRole('button', { name: /Add new contact/i }).click();
    await pageA.getByLabel('Username').fill(userC.username);
    await pageA.getByRole('button', { name: /Add Contact/i }).click({ force: true });
    await pageA.getByRole('button', { name: 'Back' }).click();

    // Open Menu -> New Group
    await pageA.getByRole('banner').getByRole('button', { name: /Menu/i }).click();
    await pageA.getByRole('button', { name: /New group/i }).click();
    const groupPanel = pageA.locator('.absolute.inset-0.z-50');
    // Select User B (David Kumar) and User C (Sarah Wilson)
    await groupPanel.getByRole('button', { name: 'David Kumar', exact: false }).click();
    await groupPanel.getByRole('button', { name: 'Sarah Wilson', exact: false }).click();
    
    // Click Next Step
    await groupPanel.getByRole('button', { name: 'Next step' }).click();
    
    // Enter group subject and create
    await groupPanel.getByPlaceholder('Group Subject').fill('Zira Test Group');
    await groupPanel.getByRole('button', { name: 'Create group' }).click();

    // Verify group is created and visible in chat list
    await expect(pageA.getByRole('button', { name: 'Zira Test Group', exact: false })).toBeVisible();

    // -------------------------------------------------------------
    // PHASE 10 & 11: VOICE & VIDEO CALLS
    // -------------------------------------------------------------
    // Open chat with B on A's screen
    await pageA.getByRole('button', { name: userB.fullName, exact: false }).click();
    
    // Initiate audio call
    await pageA.getByRole('main').getByRole('button', { name: 'Voice Call' }).click();
    
    // Accept on B's page
    await pageB.locator('.bg-accent').first().click();
    await pageA.waitForTimeout(1000);
    
    // End call on A
    await pageA.locator('.bg-error').first().click();

    // -------------------------------------------------------------
    // PHASE 12: CALL HISTORY
    // -------------------------------------------------------------
    // Open Call history panel on A
    await pageA.getByRole('button', { name: /Calls/i }).click();
    await expect(pageA.locator('.absolute.inset-0.z-40').getByText(userB.fullName)).toBeVisible();
    await pageA.locator('.absolute.inset-0.z-40').getByRole('button', { name: 'Back' }).click();

    // -------------------------------------------------------------
    // PHASE 14: BLOCK USER
    // -------------------------------------------------------------
    // A blocks B
    await pageA.getByRole('main').getByRole('button', { name: 'Menu' }).click();
    await pageA.getByRole('button', { name: 'Block user' }).click();
    await expect(pageA.getByText('You blocked this contact.')).toBeVisible();

    // A unblocks B using the link button
    await pageA.getByRole('button', { name: 'Unblock to send a message.' }).click();
    await expect(pageA.getByPlaceholder('Type a message')).toBeVisible();

    // Close contexts clean up
    await contextA.close();
    await contextB.close();
    await contextC.close();
  });
});
