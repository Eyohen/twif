import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('no invoice panel should be open', async function () {
  await expect(this.page.locator('.accounts-invoice-drawer')).toHaveCount(0);
});

When('I open the first invoice for review', async function () {
  const action = this.page
    .locator('.accounts-invoice-table tbody button')
    .filter({ hasText: /^(Review|Resolve|View)$/ })
    .first();
  await action.click();
  await this.page.waitForSelector('.review-invoice-grid', { timeout: 15000 });
});

// The evidence column was left about one letter wide while the summary took
// 818px, so the check is that no column is starved.
Then('the review columns should share the width evenly', async function () {
  const widths = await this.page.locator('.review-invoice-grid').evaluate((grid) => (
    [...grid.children].map((child) => Math.round(child.getBoundingClientRect().width))
  ));
  expect(widths.length, 'the review grid has no columns').toBeGreaterThan(1);
  const narrowest = Math.min(...widths);
  expect(narrowest, `the narrowest column is only ${narrowest}px wide (${widths.join(' / ')})`)
    .toBeGreaterThan(200);
});
