import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

async function rowFor(world, role) {
  await world.signInAs(role);
  await world.page.goto(world.rolePath('Invoices'));
  await world.page.waitForLoadState('networkidle');
  await world.page.getByPlaceholder(/Search invoice/i).first().fill(world.invoiceNumber);
  await world.page.waitForTimeout(600);
  const row = world.page.locator('tr').filter({ hasText: world.invoiceNumber }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}

Then('the invoice should read {string} for the {string}', async function (label, role) {
  const row = await rowFor(this, role);
  await expect(row.getByText(label, { exact: true })).toBeVisible();
});

Then('the invoice should not read {string} for the {string}', async function (label, role) {
  const row = await rowFor(this, role);
  await expect(row.getByText(label, { exact: true })).toHaveCount(0);
});

const queueRows = (world) => world.page.locator('.invoice-review tbody tr').filter({ hasText: world.invoiceNumber });

Then('that invoice should be in the review queue exactly once', async function () {
  await this.page.waitForLoadState('networkidle');
  await expect(queueRows(this).first()).toBeVisible({ timeout: 15000 });
  await expect(queueRows(this)).toHaveCount(1);
});

Then('its queue entry should name the payment and read {string}', async function (label) {
  const row = queueRows(this).first();
  await expect(row.getByText('Payment 1')).toBeVisible();
  await expect(row.getByText(label, { exact: true })).toBeVisible();
  await expect(row.getByText('of ₦50,000')).toBeVisible();
});
