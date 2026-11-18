import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

const TABS = ['Overview', 'Production', 'Tailor List', 'Tailor Performance', 'Tailor Target', 'Inventory', 'Notifications'];

async function everyTabVisible(page) {
  const nav = page.locator('aside nav');
  for (const label of TABS) await expect(nav.getByText(label, { exact: true })).toBeVisible();
  const scrolls = await nav.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
  expect(scrolls, 'the main tab list has its own vertical scrollbar').toBe(false);
}

Then('every main tab should be visible without scrolling the tab list', async function () {
  await this.page.waitForLoadState('networkidle');
  await everyTabVisible(this.page);
});

When('I collapse the Shortcuts', async function () {
  await this.page.getByRole('button', { name: /shortcuts/i }).click();
});

Then('the shortcuts should be hidden and every main tab still visible', async function () {
  await expect(this.page.getByRole('button', { name: 'Active Jobs' })).toHaveCount(0);
  await everyTabVisible(this.page);
});

When('I expand the Shortcuts', async function () {
  await this.page.getByRole('button', { name: /shortcuts/i }).click();
});

Then('the shortcuts should be listed again', async function () {
  for (const label of ['Active Jobs', 'Assign Tailor', 'Fabric Allocation', 'Production Notes']) {
    await expect(this.page.locator('aside').getByText(label, { exact: true })).toBeAttached();
  }
});
