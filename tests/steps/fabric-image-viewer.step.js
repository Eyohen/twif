import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const addFabric = async (world, image) => {
  const tag = Date.now().toString().slice(-7);
  world.fabricName = `Viewer Test ${tag}`;
  const client = await world.api('Inventory Manager');
  const response = await client.post(`${API_URL}/oms/fabrics`, {
    data: { name: world.fabricName, sku: `VW-${tag}`, type: 'Fabric', unit: 'yards', quantity: 10, store: 'lekki', ...(image ? { image } : {}) },
  });
  const body = await response.json().catch(() => ({}));
  await client.dispose();
  expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
};

Given('a fabric has been added with a photo', async function () { await addFabric(this, PIXEL); });
Given('a fabric has been added without a photo', async function () { await addFabric(this, null); });

When('I search the inventory list for that fabric', async function () {
  await this.page.goto(this.rolePath('Inventory'));
  await this.page.getByPlaceholder(/search name, sku/i).fill(this.fabricName);
  await expect(this.page.getByText(this.fabricName).first()).toBeVisible({ timeout: 15000 });
});

When('I click its photo', async function () {
  await this.page.getByRole('button', { name: `View the photo of ${this.fabricName} full size` }).first().click();
});

Then('the photo should open full size', async function () {
  const dialog = this.page.getByRole('dialog', { name: this.fabricName });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toBeVisible();
});

When('I zoom in', async function () {
  await this.page.getByRole('button', { name: 'Zoom in' }).click();
});

Then('the photo should be shown larger', async function () {
  await expect(this.page.getByRole('dialog', { name: this.fabricName }).getByText('150%')).toBeVisible();
});

When('I press Escape', async function () { await this.page.keyboard.press('Escape'); });
When('I close the full size photo', async function () {
  await this.page.getByRole('dialog', { name: this.fabricName }).getByRole('button', { name: /close/i }).click();
});

Then('the full size photo should close', async function () {
  await expect(this.page.getByRole('dialog', { name: this.fabricName })).toHaveCount(0);
});

When("I open that fabric's page", async function () {
  await this.page.getByText(this.fabricName).first().click();
  await expect(this.page.getByRole('heading', { name: this.fabricName }).first()).toBeVisible({ timeout: 15000 });
});

When("I click the photo on the fabric's page", async function () {
  await this.page.getByRole('button', { name: `View the photo of ${this.fabricName} full size` }).click();
});

Then("its picture should not be a link to a full size view", async function () {
  await expect(this.page.getByRole('button', { name: `View the photo of ${this.fabricName} full size` })).toHaveCount(0);
});
