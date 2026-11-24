import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const register = async (world) => {
  const client = await world.api('Accountant');
  const body = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  return body?.data?.invoices || [];
};

Given('a newer invoice is raised afterwards', async function () {
  this.firstInvoiceNumber = this.invoiceNumber;
  this.firstInvoicePaymentStamp = (await register(this)).find((invoice) => invoice.invoiceNumber === this.firstInvoiceNumber)?.paymentUpdatedAt;
  // The two must not share a timestamp.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const runTag = Date.now().toString().slice(-6);
  const name = `Newer Test ${runTag}`;
  const client = await this.api('Store Manager');
  const response = await client.post(`${API_URL}/oms/invoices/send-email`, {
    data: {
      recipientEmail: `newer.${runTag}@example.com`,
      store: 'lekki',
      paymentStatus: 'unpaid',
      customer: { name, phone: `0812${runTag}0` },
      items: [{ description: 'Ordering test garment', quantity: 1, rate: 30000, amount: 30000 }],
      subtotal: 30000,
      balanceDue: 30000,
    },
  });
  const body = await response.json();
  expect(response.ok() || String(body?.message || '').startsWith('Invoice saved'), JSON.stringify(body)).toBe(true);
  await client.dispose();
  const raised = (await register(this)).find((invoice) => invoice.customer === name);
  expect(raised, 'the newer invoice never reached the register').toBeTruthy();
  this.newerInvoiceNumber = raised.invoiceNumber;
  await new Promise((resolve) => setTimeout(resolve, 1100));
});

When('production work is raised on the first invoice', async function () {
  const client = await this.api('Store Manager');
  const response = await client.post(`${API_URL}/oms/tracking/order-sheet`, {
    data: {
      invoiceNumber: this.firstInvoiceNumber,
      orderSheet: { customer: 'Ordering test', item: 'Test garment', measurements: 'Chest 40', delivery: new Date(Date.now() + 12096e5).toISOString().slice(0, 10) },
    },
  });
  expect(response.ok(), JSON.stringify(await response.json().catch(() => ({})))).toBe(true);
  await client.dispose();
});

When('the Store Manager records a payment of {int} on the first invoice', async function (amount) {
  const client = await this.api('Store Manager');
  const response = await client.patch(`${API_URL}/oms/invoices/${this.firstInvoiceNumber}/payment`, {
    data: { amountReceived: amount, method: 'transfer', paymentEvidence: [{ name: 'receipt.png', type: 'image/png', size: 70, dataUrl: `data:image/png;base64,${TINY_PNG}` }] },
  });
  expect(response.status(), JSON.stringify(await response.json().catch(() => ({})))).toBe(200);
  await client.dispose();
});

const positionOf = (invoices, number) => invoices.findIndex((invoice) => invoice.invoiceNumber === number);

Then('Accounts should list the newer invoice above the first', async function () {
  const invoices = await register(this);
  const first = invoices.find((invoice) => invoice.invoiceNumber === this.firstInvoiceNumber);
  // The production work did touch the row, so a sort on updatedAt would be wrong here.
  expect(new Date(first.updatedAt) > new Date(invoices.find((invoice) => invoice.invoiceNumber === this.newerInvoiceNumber).updatedAt), 'the order sheet change did not touch the invoice').toBe(true);
  expect(positionOf(invoices, this.newerInvoiceNumber)).toBeGreaterThan(-1);
  expect(positionOf(invoices, this.newerInvoiceNumber)).toBeLessThan(positionOf(invoices, this.firstInvoiceNumber));
});

Then("the first invoice's payment update time should not have moved", async function () {
  const first = (await register(this)).find((invoice) => invoice.invoiceNumber === this.firstInvoiceNumber);
  expect(first.paymentUpdatedAt).toBe(this.firstInvoicePaymentStamp);
});

Then('Accounts should list the first invoice above the newer one', async function () {
  const invoices = await register(this);
  expect(positionOf(invoices, this.firstInvoiceNumber)).toBeGreaterThan(-1);
  expect(positionOf(invoices, this.firstInvoiceNumber)).toBeLessThan(positionOf(invoices, this.newerInvoiceNumber));
});
