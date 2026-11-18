import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('the navigation should offer Assign Fabric and Production', async function () {
  const nav = this.page.locator('aside');
  for (const label of ['Overview', 'Inventory', 'Assign Fabric', 'Production', 'Notifications']) {
    await expect(nav.getByText(label, { exact: true }).first()).toBeVisible();
  }
});

Then('the Overview should not show the Production Priority Queue', async function () {
  await this.page.waitForLoadState('networkidle');
  await expect(this.page.getByText('Inventory Overview').first()).toBeVisible();
  await expect(this.page.getByText(/Production Priority Queue|Priority Production Queue/i)).toHaveCount(0);
});

Then('I should see the Priority Production Queue and the Production Job List', async function () {
  await expect(this.page.getByText('Priority Production Queue')).toBeVisible();
  await expect(this.page.getByText('Production Job List')).toBeVisible();
});

Then('there should be no button to assign, edit or move a job along', async function () {
  const forbidden = /assign tailor|set in progress|mark ready|reject|confirm fabric|save assignment|score|edit|delete/i;
  await expect(this.page.getByRole('button', { name: forbidden })).toHaveCount(0);
});

When('I view the first job in the list', async function () {
  await this.page.getByRole('button', { name: /^view$/i }).first().click();
});

Then('its details should open as view only', async function () {
  const dialog = this.page.getByRole('dialog', { name: /production job details/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/View only/i)).toBeVisible();
  const buttons = await dialog.getByRole('button').allInnerTexts();
  for (const label of buttons) expect(['Assign Fabric', 'Close']).toContain(label.trim());
});

Then('I should see the orders awaiting fabric', async function () {
  await expect(this.page.getByText('Orders Awaiting Fabric')).toBeVisible({ timeout: 15000 });
});
