import { Given, When, Then } from '@cucumber/cucumber';
import { expect, request } from '@playwright/test';
import { ACCOUNTS, API_URL } from '../support/world.js';

// These scenarios are about the rule, not about the screens that reach it, so
// the order is put into the state under test directly and only the rule's
// effect is read from the app.
async function anOrderWith({ approval, status, tailor }) {
  const client = await request.newContext();
  const list = await client.get(`${API_URL}/oms/invoices/sent`);
  const invoices = (await list.json())?.data?.invoices || [];

  const candidate = invoices.find((invoice) => invoice.orderSheet && invoice.trackingToken
    && invoice.accountApprovalStatus === approval);
  if (!candidate) {
    await client.dispose();
    throw new Error(`No order is currently ${approval} with an order sheet, so this rule cannot be checked`);
  }

  if (status || tailor) {
    await client.patch(`${API_URL}/oms/tracking/order-sheet/${candidate.trackingToken}`, {
      data: { ...(status ? { status } : {}), ...(tailor ? { tailor } : {}) },
    });
  }
  await client.dispose();
  return candidate;
}

Given('an order sheet has been raised but Accounts have not reviewed it', async function () {
  this.order = await anOrderWith({ approval: 'Pending Accounts' });
});

Given('an order sheet has been raised and Accounts have approved it', async function () {
  this.order = await anOrderWith({ approval: 'Approved' });
});

When('the Production Manager opens Production', async function () {
  await this.signInAs('Production Manager');
  await this.page.goto(this.rolePath('Production'));
  await this.page.waitForLoadState('networkidle');
  await this.page.waitForTimeout(1200);
});

Then('that order should not be listed as a production job', async function () {
  const board = await this.page.evaluate(() => document.body.innerText);
  expect(board, `${this.order.invoiceNumber} is on the board before Accounts have approved it`)
    .not.toContain(this.order.invoiceNumber);
});

Then('that order should be listed as a production job', async function () {
  const board = await this.page.evaluate(() => document.body.innerText);
  expect(board, `${this.order.invoiceNumber} is approved but is not on the board`)
    .toContain(this.order.invoiceNumber);
});

Given('a tailor has a job that has not been started', async function () {
  // Put a job in the tailor's hands, not yet started.
  this.order = await anOrderWith({
    approval: 'Approved',
    status: 'Assigned',
    tailor: ACCOUNTS.Tailor.name,
  });

  await this.signInAs('Tailor');
  await this.page.goto(this.rolePath('My Tasks'));
  await this.page.waitForLoadState('networkidle');

  this.card = this.page.locator('div')
    .filter({ hasText: this.order.customer })
    .filter({ has: this.page.getByRole('button', { name: /start work|work in progress|work completed/i }) })
    .last();
  await expect(this.card).toBeVisible({ timeout: 15000 });
});

When('the tailor starts that job', async function () {
  await this.card.getByRole('button', { name: /start work/i }).click();
  await this.page.getByRole('button', { name: /yes, start work/i }).click();
  await this.page.waitForTimeout(1500);
});

// The controls follow the job's state, so a garment cannot be reported finished
// before anyone has touched it.
Then('Start Work should be offered', async function () {
  await expect(this.card.getByRole('button', { name: /^start work$/i })).toBeEnabled();
});

Then('Start Work should not be offered', async function () {
  await expect(this.card.getByRole('button', { name: /^start work$/i })).toHaveCount(0);
});

Then('Mark Ready should be offered', async function () {
  await expect(this.card.getByRole('button', { name: /mark ready/i })).toBeEnabled();
});

Then('Mark Ready should not be offered', async function () {
  await expect(this.card.getByRole('button', { name: /mark ready/i })).toBeDisabled();
});
