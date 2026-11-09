import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I add an inventory item named {string}', async function (name) {
  // Named uniquely per run so repeat runs do not collide on the SKU.
  this.itemName = `${name} ${Date.now().toString().slice(-6)}`;

  await this.page.getByRole('button', { name: /add item/i }).click();
  const form = this.page.locator('.receive-stock-backdrop form');
  await form.waitFor();

  // Filled by label rather than by position: the form has gained and moved
  // fields before (a receiving store and a supplier replaced a free-text
  // location), and a positional fill typed into the wrong box.
  const field = (label) => form.locator('label').filter({ hasText: new RegExp(`^\\s*${label}`, 'i') });
  await field('SKU').locator('input').fill(`TST-${Date.now().toString().slice(-6)}`);
  await field('Name').locator('input').fill(this.itemName);
  await field('Type').locator('select').selectOption({ index: 1 });
  await field('Colour').locator('input').fill('Navy');
  await field('Quantity').locator('input').fill('12');
  await field('Cost per').locator('input').fill('7500');
  await field('Receiving store').locator('select').selectOption({ index: 1 });
  await field('Low stock').locator('input').fill('4');
  await field('Supplier').locator('input').fill('Test Supplier Ltd');

  await form.getByRole('button', { name: /^add item$/i }).click();
  await this.page.waitForSelector('.receive-stock-backdrop', { state: 'detached', timeout: 15000 });
});

Then('the inventory list should include {string}', async function (name) {
  expect(this.itemName, 'the item was never named').toContain(name);
  // The list pages at ten, so a newly added item is not necessarily on the
  // first page — it is searched for, the way anyone would look for it.
  await this.page.getByPlaceholder(/Search name, SKU/).fill(this.itemName);
  await this.page.waitForTimeout(600);
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
