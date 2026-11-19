import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

const roleSelect = (page) => page.locator('select').filter({ has: page.locator('option', { hasText: 'All Roles' }) }).first();

When('I filter the users by the Inventory Manager role', async function () {
  const select = roleSelect(this.page);
  await expect(select).toBeVisible({ timeout: 15000 });
  await expect(select.locator('option', { hasText: 'Inventory Manager' })).toHaveCount(1);
  await select.selectOption({ label: 'Inventory Manager' });
  await this.page.waitForTimeout(500);
});

Then('only Inventory Managers should be listed', async function () {
  const rows = this.page.locator('tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 15000 });
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(rows.nth(i)).toContainText(/Inventory/);
  }
});
