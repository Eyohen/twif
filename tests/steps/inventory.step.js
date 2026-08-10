import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I add an inventory item named {string}', async function (name) {
  // Named uniquely per run so repeat runs do not collide on the SKU.
  this.itemName = `${name} ${Date.now().toString().slice(-6)}`;

  await this.page.getByRole('button', { name: /add item/i }).click();
  const form = this.page.locator('.receive-stock-backdrop form');
  await form.waitFor();

  const fields = form.locator('input:not([type="file"])');
  await fields.nth(0).fill(`TST-${Date.now().toString().slice(-6)}`);
  await fields.nth(1).fill(this.itemName);
  await form.locator('select').first().selectOption({ index: 1 });
  await fields.nth(2).fill('Navy');
  await fields.nth(3).fill('12');
  await fields.nth(4).fill('7500');
  await fields.nth(5).fill('Lekki store, rack 1');
  await fields.nth(6).fill('4');

  await form.getByRole('button', { name: /^add item$/i }).click();
  await this.page.waitForSelector('.receive-stock-backdrop', { state: 'detached', timeout: 15000 });
});

Then('the inventory list should include {string}', async function (name) {
  expect(this.itemName, 'the item was never named').toContain(name);
  const row = this.page.locator('.inventory-table-desktop tbody tr').filter({ hasText: this.itemName });
  await expect(row).toHaveCount(1, { timeout: 15000 });
});

When('I open the first inventory item', async function () {
  await this.page
    .locator('.inventory-table-desktop tbody')
    .getByRole('button', { name: 'View' })
    .first()
    .click();
  await this.page.waitForSelector('.inventory-item-details', { timeout: 15000 });
});
