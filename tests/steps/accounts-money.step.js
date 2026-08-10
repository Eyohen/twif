import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

// The invoice is raised through the API rather than the New Invoice form: these
// scenarios are about what happens to the money afterwards, and the form has a
// feature of its own.
Given('an invoice for {int} that nothing has been paid against', async function (total) {
  const runTag = Date.now().toString().slice(-6);
  this.customerName = `Money Test ${runTag}`;
  this.invoiceTotal = total;

  const client = await this.api('Store Manager');
  const response = await client.post(`${API_URL}/oms/invoices/send-email`, {
    data: {
      // example.com is reserved for documentation, so nothing reaches a person.
      recipientEmail: `money.${runTag}@example.com`,
      store: 'lekki',
      paymentStatus: 'unpaid',
      customer: { name: this.customerName, phone: `0811${runTag}0` },
      items: [{ description: 'Reconciliation test garment', quantity: 1, rate: total, amount: total }],
      subtotal: total,
      balanceDue: total,
    },
  });
  const body = await response.json();

  // The email provider refuses example.com, and the endpoint answers with an
  // error even though it has already stored the invoice. The record is what
  // these scenarios are about, so it is read back from the register.
  const emailOnlyFailure = String(body?.message || '').startsWith('Invoice saved');
  expect(response.ok() || emailOnlyFailure, `the invoice could not be raised: ${JSON.stringify(body)}`).toBe(true);

  const register = await client.get(`${API_URL}/oms/invoices/sent`);
  const invoices = (await register.json())?.data?.invoices || [];
  await client.dispose();

  const raised = invoices.find((invoice) => invoice.customer === this.customerName);
  expect(raised, 'the invoice never reached the register').toBeTruthy();
  this.invoiceNumber = raised.invoiceNumber;
});

const readInvoice = async (world) => {
  const client = await world.api();
  const response = await client.get(`${API_URL}/oms/invoices/sent`);
  const body = await response.json();
  await client.dispose();
  return (body?.data?.invoices || []).find((invoice) => invoice.invoiceNumber === world.invoiceNumber);
};

// Recorded the way Accounts would: on the payment's own page, behind View.
When('the Accountant records {int} received on it', async function (amount) {
  if (!this.onPaymentsPage) {
    await this.signInAs('Accountant');
    await this.page.goto(this.rolePath('Payments'));
    await this.page.getByPlaceholder(/search/i).first().fill(this.invoiceNumber);
    await this.page.getByRole('button', { name: /^view$/i }).first().click();
    this.onPaymentsPage = true;
  }

  const form = this.page.locator('form.record-payment');
  await expect(form).toBeVisible({ timeout: 15000 });
  await form.locator('input[type="number"]').fill(String(amount));
  await form.getByRole('button', { name: /record payment/i }).click();
  await expect(form.locator('input[type="number"]')).toHaveValue('', { timeout: 15000 });
});

When('the Accountant tries to record {int} received on it', async function (amount) {
  const client = await this.api('Accountant');
  this.response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}/payment`, {
    data: { amountReceived: amount },
  });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

When('the Tailor tries to record {int} received on it', async function (amount) {
  const client = await this.api('Tailor');
  this.response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}/payment`, {
    data: { amountReceived: amount },
  });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

Then('the invoice should be part paid with {int} recorded', async function (amount) {
  const invoice = await readInvoice(this);
  expect(invoice?.paymentStatus, 'the status did not follow the money').toBe('Partial Paid');
  expect(Number(invoice?.paid)).toBe(amount);
});

Then('the invoice should be fully paid with {int} recorded', async function (amount) {
  const invoice = await readInvoice(this);
  expect(invoice?.paymentStatus).toBe('Fully Paid');
  expect(Number(invoice?.paid)).toBe(amount);
});

// Who took the money is half the point of recording it.
Then('the payment should be listed with who recorded it', async function () {
  const history = this.page.locator('.payment-history');
  await expect(history).toBeVisible({ timeout: 15000 });
  await expect(history).toContainText('Funke');
});

Then('the payment should be refused for being more than is owed', function () {
  expect(this.response.status(), 'an overpayment was accepted').toBe(400);
  expect(String(this.body?.message || '')).toMatch(/more than/i);
});

Then('the invoice should still have nothing recorded against it', async function () {
  const invoice = await readInvoice(this);
  expect(Number(invoice?.paid || 0)).toBe(0);
});

Then('the API should refuse the payment as not theirs to record', function () {
  expect(this.response.status(), 'a tailor was allowed to record a payment').toBe(403);
});
