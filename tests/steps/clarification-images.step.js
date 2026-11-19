import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_BYTES = Buffer.from(PNG.split(',')[1], 'base64');

const readInvoice = async (world, role = 'Accountant') => {
  const client = await world.api(role);
  const body = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  return (body?.data?.invoices || []).find((invoice) => invoice.invoiceNumber === world.invoiceNumber);
};

Given('Accounts have flagged the invoice asking for the right payment photo', async function () {
  const client = await this.api('Accountant');
  const response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}/account-approval`, {
    data: { status: 'Flagged', note: 'The payment photo looks wrong.' },
  });
  expect(response.status(), await response.text()).toBe(200);
  await client.dispose();
});

async function answer(world, clarificationImages) {
  const client = await world.api('Store Manager');
  world.answer = await client.patch(`${API_URL}/oms/invoices/${world.invoiceNumber}`, {
    data: { clarification: 'That was the wrong photo; the right one is attached.', ...(clarificationImages ? { clarificationImages } : {}) },
  });
  world.answerBody = await world.answer.json().catch(() => ({}));
  await client.dispose();
  expect(world.answer.status(), JSON.stringify(world.answerBody)).toBe(200);
}

When('the Store Manager answers with a note and an image', async function () {
  await answer(this, [{ name: 'right-photo.png', type: 'image/png', size: 70, dataUrl: PNG }]);
});

When('the Store Manager answers with a note only', async function () {
  await answer(this, null);
});

When('the Store Manager answers with a note and a web page pretending to be an image', async function () {
  await answer(this, [{ name: 'page.png', type: 'image/png', size: 40, dataUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' }]);
});

When('the Store Manager clarifies the first payment with an image', async function () {
  const invoice = await readInvoice(this, 'Store Manager');
  const payment = invoice.paymentHistory[0];
  const client = await this.api('Store Manager');
  const response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}/payments/${payment.id}/clarify`, {
    data: { clarification: 'Sent from the customer\'s spouse.', clarificationImages: [{ name: 'receipt.png', type: 'image/png', size: 70, dataUrl: PNG }] },
  });
  expect(response.status(), await response.text()).toBe(200);
  await client.dispose();
});

Then('Accounts should see the clarification with {int} image(s)', async function (count) {
  const invoice = await readInvoice(this);
  expect(invoice.accountApprovalStatus).toBe('Pending Accounts');
  expect(invoice.storeManagerClarification).toBeTruthy();
  expect(invoice.storeManagerClarificationImages).toHaveLength(count);
});

Then('the image should be available to Accounts', async function () {
  const client = await this.api('Accountant');
  const response = await client.get(`${API_URL}/oms/invoices/${this.invoiceNumber}/clarification-images/0`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  expect(Buffer.compare(await response.body(), PNG_BYTES)).toBe(0);
  await client.dispose();
});

Then('the invoice list should not carry the image itself', async function () {
  const invoice = await readInvoice(this);
  expect(JSON.stringify(invoice)).not.toContain('base64');
});

Then('the first payment should carry {int} clarification image(s)', async function (count) {
  const invoice = await readInvoice(this);
  const payment = invoice.paymentHistory[0];
  expect(payment.reviewStatus).toBe('Pending Accounts');
  expect(payment.clarificationImages).toHaveLength(count);
  expect(JSON.stringify(payment)).not.toContain('base64');
  const client = await this.api('Accountant');
  const response = await client.get(`${API_URL}/oms/invoices/${this.invoiceNumber}/payments/${payment.id}/clarification-images/0`);
  expect(response.status()).toBe(200);
  await client.dispose();
});

When('I open that invoice to answer the flag', async function () {
  await this.page.getByPlaceholder('Search invoice, customer...').first().fill(this.invoiceNumber);
  await this.page.waitForTimeout(600);
  await this.page.getByRole('button', { name: `Actions for ${this.invoiceNumber}` }).click();
  await this.page.getByRole('button', { name: /review flag/i }).click();
});

When('I write a clarification and attach an image', async function () {
  const dialog = this.page.locator('[role="dialog"], .modal, form').filter({ hasText: 'Your clarification' }).last();
  await this.page.getByLabel(/your clarification/i).first().fill('That was the wrong photo; the right one is attached.');
  await this.page.getByLabel('Attach clarification images').first().setInputFiles({ name: 'right.png', mimeType: 'image/png', buffer: PNG_BYTES });
  await expect(this.page.getByAltText('Clarification attachment 1')).toBeVisible();
  void dialog;
});

When('I submit the clarification', async function () {
  await this.page.getByRole('button', { name: /submit clarification/i }).click();
  await this.page.waitForTimeout(2000);
});

Then('the Accountant can see the image when reviewing the invoice', async function () {
  await this.signInAs('Accountant');
  await this.page.goto(this.rolePath('Invoices'));
  await this.page.waitForLoadState('networkidle');
  const row = this.page.locator('tr').filter({ hasText: this.invoiceNumber }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole('button', { name: /review/i }).first().click();
  await expect(this.page.getByText('Store Manager clarification')).toBeVisible({ timeout: 15000 });
  await expect(this.page.getByAltText(/Clarification image 1/)).toBeVisible({ timeout: 15000 });
});
