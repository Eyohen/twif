import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const readInvoice = async (world, roleName) => {
  const client = await world.api(roleName);
  const body = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  return (body?.data?.invoices || []).find((invoice) => invoice.invoiceNumber === world.invoiceNumber);
};

When('the Store Manager records a payment of {int} on it', async function (amount) {
  const client = await this.api('Store Manager');
  const response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}/payment`, {
    data: {
      amountReceived: amount,
      method: 'transfer',
      paymentEvidence: [{ name: 'receipt.png', type: 'image/png', size: 70, dataUrl: `data:image/png;base64,${TINY_PNG}` }],
    },
  });
  const body = await response.json().catch(() => ({}));
  await client.dispose();
  expect(response.status(), JSON.stringify(body)).toBe(200);
});

const nth = (ordinal) => ({ first: 0, second: 1 }[ordinal]);

async function review(world, roleName, ordinal, status, note = '') {
  const invoice = await readInvoice(world, 'Accountant');
  const payment = invoice.paymentHistory[nth(ordinal)];
  const client = await world.api(roleName);
  world.attempt = await client.patch(`${API_URL}/oms/invoices/${world.invoiceNumber}/payments/${payment.id}/review`, { data: { status, note } });
  world.attemptBody = await world.attempt.json().catch(() => ({}));
  await client.dispose();
}

When('Accounts approve the {word} payment', async function (ordinal) {
  await review(this, 'Accountant', ordinal, 'Approved');
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
});

When('Accounts flag the {word} payment asking for the sender\'s name', async function (ordinal) {
  await review(this, 'Accountant', ordinal, 'Flagged', 'Whose name is on the transfer?');
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
});

When('the Store Manager tries to approve the {word} payment', async function (ordinal) {
  await review(this, 'Store Manager', ordinal, 'Approved');
});

When('the Store Manager clarifies the {word} payment', async function (ordinal) {
  const invoice = await readInvoice(this, 'Store Manager');
  const payment = invoice.paymentHistory[nth(ordinal)];
  const client = await this.api('Store Manager');
  const response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}/payments/${payment.id}/clarify`, {
    data: { clarification: 'It was sent from the customer\'s spouse.' },
  });
  const body = await response.json().catch(() => ({}));
  await client.dispose();
  expect(response.status(), JSON.stringify(body)).toBe(200);
});

Then('Accounts should see that payment awaiting review', async function () {
  const invoice = await readInvoice(this, 'Accountant');
  const waiting = invoice.paymentHistory.filter((entry) => entry.reviewStatus === 'Pending Accounts');
  expect(waiting.length, 'no payment is awaiting review').toBe(1);
  expect(waiting[0].id).toBeTruthy();
});

Then('the {word} payment should be {word}', async function (ordinal, status) {
  const invoice = await readInvoice(this, 'Accountant');
  expect(invoice.paymentHistory[nth(ordinal)].reviewStatus).toBe(status);
});

Then('the {word} payment should still be awaiting review', async function (ordinal) {
  const invoice = await readInvoice(this, 'Accountant');
  expect(invoice.paymentHistory[nth(ordinal)].reviewStatus).toBe('Pending Accounts');
});

Then('the queue should list a payment on that invoice', async function () {
  const row = this.page.locator('.invoice-review tbody tr').filter({ hasText: this.invoiceNumber }).filter({ hasText: 'Payment 1' });
  await expect(row.first()).toBeVisible({ timeout: 15000 });
});

When('I open the Needs Clarification tab', async function () {
  await this.page.getByRole('button', { name: /Needs Clarification/ }).first().click();
  await this.page.waitForTimeout(800);
});

Then('the invoice list should include that invoice', async function () {
  await expect(this.page.locator('tr').filter({ hasText: this.invoiceNumber }).first()).toBeVisible({ timeout: 15000 });
});

When('I search for that invoice', async function () {
  await this.page.waitForLoadState('networkidle');
  await this.page.getByPlaceholder('Search invoice, customer...').first().fill(this.invoiceNumber);
  await this.page.waitForTimeout(600);
});

When('I reload the page', async function () {
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

Then('that invoice should read Payment Flagged', async function () {
  const row = this.page.locator('tr').filter({ hasText: this.invoiceNumber }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.getByText('Payment Flagged')).toBeVisible();
});

Then('that invoice should no longer read Payment Flagged', async function () {
  const row = this.page.locator('tr').filter({ hasText: this.invoiceNumber }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.getByText('Payment Flagged')).toHaveCount(0);
});
