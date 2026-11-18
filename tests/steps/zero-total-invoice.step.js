import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

const readInvoice = async (world) => {
  const client = await world.api('Store Manager');
  const body = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  return (body?.data?.invoices || []).find((invoice) => invoice.invoiceNumber === world.invoiceNumber);
};

When('a Store Manager raises an invoice that comes to 0 marked as unpaid', async function () {
  const runTag = Date.now().toString().slice(-6);
  this.customerName = `Zero Test ${runTag}`;
  const client = await this.api('Store Manager');
  const response = await client.post(`${API_URL}/oms/invoices/send-email`, {
    data: {
      recipientEmail: `zero.${runTag}@example.com`,
      store: 'lekki',
      paymentStatus: 'unpaid',
      customer: { name: this.customerName, phone: `0812${runTag}0` },
      items: [{ description: 'Fully discounted garment', quantity: 1, rate: 30000, amount: 0, discountMode: 'percent', discountPercent: 100, discountAmount: 30000 }],
      subtotal: 30000,
      balanceDue: 0,
    },
  });
  const body = await response.json().catch(() => ({}));
  // The email provider refuses example.com after the invoice is stored.
  expect(response.ok() || String(body?.message || '').startsWith('Invoice saved'), JSON.stringify(body)).toBe(true);
  const register = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  const raised = (register?.data?.invoices || []).find((invoice) => invoice.customer === this.customerName);
  expect(raised, 'the invoice never reached the register').toBeTruthy();
  this.invoiceNumber = raised.invoiceNumber;
});

When('the invoice is given a 100% discount', async function () {
  const client = await this.api('Store Manager');
  const response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}`, {
    data: { invoiceDiscountMode: 'percent', invoiceDiscountPercent: 100 },
  });
  const body = await response.json().catch(() => ({}));
  await client.dispose();
  expect(response.status(), JSON.stringify(body)).toBe(200);
});

Then('the invoice should read Fully Paid', async function () {
  const invoice = await readInvoice(this);
  expect(invoice.total).toBe(0);
  expect(invoice.paymentStatus).toBe('Fully Paid');
});

Then('the invoice order status should read Fully Paid', async function () {
  const invoice = await readInvoice(this);
  expect(invoice.orderStatus).toBe('Fully Paid');
});
