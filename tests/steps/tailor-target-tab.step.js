import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then("I should see the tailors' weekly targets", async function () {
  await expect(this.page.locator('.os-page h2', { hasText: 'Tailor Target' })).toBeVisible();
  await expect(this.page.locator('aside').getByText('Tailor Target', { exact: true })).toBeVisible();
  await expect(this.page.locator('.target-row').first()).toBeVisible({ timeout: 15000 });
});

Then('I should be able to step back to an earlier week', async function () {
  await this.page.getByRole('button', { name: 'Previous week' }).click();
  await expect(this.page.getByRole('button', { name: 'This week' })).toBeVisible();
});
