import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

const statusKey = (label) => label === 'Fully Paid' ? 'fully_paid' : 'partial_paid';

Given('I prepare a new invoice with payment status {string} and no payment method', async function (status) {
  this.paymentMethodCustomer = `Method Required ${Date.now().toString().slice(-7)}`;
  await this.page.getByRole('button', { name: /new invoice/i }).first().click();
  await this.page.waitForSelector('.invoice-item-fields', { timeout: 15000 });
  await this.page.getByPlaceholder(/Search or type customer/).fill(this.paymentMethodCustomer);
  await this.page.getByPlaceholder('e.g. 08012345678').fill(`0861${Date.now().toString().slice(-7)}`);

  const item = this.page.locator('.invoice-item-fields').first();
  await item.locator('input').nth(0).fill('Payment method test garment');
  await item.locator('input').nth(1).fill('25000');
  await this.page.locator('label').filter({ hasText: 'Payment Status' })
    .locator('select').selectOption(statusKey(status));
  if (status === 'Partially Paid') {
    await this.page.locator('label').filter({ hasText: 'Amount Received' })
      .locator('input').fill('10000');
  }
});

Then('Payment Method should be marked as required', async function () {
  const field = this.page.locator('label').filter({ hasText: 'Payment Method' });
  await expect(field).toContainText('*');
  await expect(field.locator('select')).toHaveAttribute('required', '');
});

When('I try to save that invoice', async function () {
  await this.page.getByRole('button', { name: /^save$/i }).click();
});

Then('I should be prompted to select a payment method', async function () {
  await expect(this.page.getByText(/select a payment method/i)).toBeVisible();
});

Then('the invoice without a payment method should not be saved', async function () {
  const manager = await this.api('Store Manager');
  const response = await manager.get(`${API_URL}/oms/invoices/sent`);
  const invoices = (await response.json())?.data?.invoices || [];
  await manager.dispose();
  expect(invoices.some((invoice) => invoice.customer === this.paymentMethodCustomer)).toBe(false);
});

When('I submit a {string} invoice without a payment method directly to the API', async function (status) {
  const owner = await this.api('Owner');
  const oldResponse = await owner.get(`${API_URL}/oms/invoices/sent`);
  const oldInvoices = (await oldResponse.json())?.data?.invoices || [];
  for (const invoice of oldInvoices.filter((entry) => entry.customer?.startsWith('API Method Required '))) {
    await owner.delete(`${API_URL}/oms/invoices/${invoice.invoiceNumber}`);
  }
  await owner.dispose();

  const tag = Date.now().toString().slice(-7);
  const manager = await this.api('Store Manager');
  this.response = await manager.post(`${API_URL}/oms/invoices/send-email`, {
    data: {
      skipEmail: true,
      store: 'lekki',
      invoiceNumber: `INVMETHOD${tag}`,
      paymentStatus: statusKey(status),
      amountReceived: status === 'Fully Paid' ? 25000 : 10000,
      customer: { name: `API Method Required ${tag}`, phone: `0871${tag}` },
      items: [{ description: 'Payment method test garment', quantity: 1, rate: 25000, amount: 25000 }],
      subtotal: 25000,
      balanceDue: 25000,
    },
  });
  this.body = await this.response.json().catch(() => null);
  await manager.dispose();
});

Then('the API should reject the missing payment method', function () {
  expect(this.response.status()).toBe(400);
  expect(this.body?.message).toMatch(/select a payment method/i);
});
