import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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
  // Picture thumbnails open a full-size view; they change nothing.
  for (const label of buttons) {
    if (/^(Image \d+|Style reference.*|Reference.*)$/i.test(label.trim())) continue;
    expect(['Assign Fabric', 'Close']).toContain(label.trim());
  }
});

Then('I should see the orders awaiting fabric', async function () {
  await expect(this.page.getByText('Orders Awaiting Fabric')).toBeVisible({ timeout: 15000 });
});

Given('the order carries a reference image', async function () {
  const client = await this.api();
  const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { status: 'Order Sheet Confirmed', styleImages: [{ label: 'Image 1', name: 'ref.png', dataUrl: PIXEL }] },
  });
  expect(response.ok(), 'the reference image could not be attached to the order').toBeTruthy();
  await client.dispose();
});

When('I view the job for that order', async function () {
  await this.page.getByPlaceholder(/search by customer/i).fill(this.order.invoiceNumber);
  await this.page.getByRole('button', { name: /^view$/i }).first().click();
});

Then('I should see its reference image', async function () {
  const dialog = this.page.getByRole('dialog', { name: /production job details/i });
  await expect(dialog.getByText(/Reference Images \(1\)/)).toBeVisible();
  await expect(dialog.locator('img').first()).toBeVisible();
});

Then('I can open the reference image full size', async function () {
  await this.page.getByRole('dialog', { name: /production job details/i }).locator('button.tailor-style-image').first().click();
  await expect(this.page.getByRole('dialog', { name: 'Image 1' }).locator('img')).toBeVisible();
});
