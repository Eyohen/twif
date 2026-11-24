import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

const box = (world) => world.page.getByLabel('Search fabric for Fabric test suit');

When("I type the fabric's name into the fabric search", async function () { await box(this).pressSequentially(this.fabricName); });
When("I type the fabric's SKU into the fabric search", async function () { await box(this).pressSequentially(this.fabricSku); });
When('I type {string} into the fabric search', async function (text) { await box(this).pressSequentially(text); });

Then('the fabric should be listed in the search results', async function () {
  await expect(this.page.getByRole('listbox').getByRole('option', { name: new RegExp(this.fabricName) })).toBeVisible();
});

When('I pick it from the search results', async function () {
  await this.page.getByRole('listbox').getByRole('option', { name: new RegExp(this.fabricName) }).click();
});

Then('it should be added to the garment', async function () {
  await expect(this.page.getByLabel(`How much ${this.fabricName} this garment needs`)).toBeVisible();
  await expect(box(this)).toHaveValue('');
});

Then('the search should say nothing matches', async function () {
  await expect(this.page.getByText(/No fabric matches/)).toBeVisible();
});
