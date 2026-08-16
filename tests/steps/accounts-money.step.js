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

// What an invoice is for can be corrected; what it comes to cannot.
const editInvoice = async function (body) {
  const client = await this.api('Owner');
  this.response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}`, { data: body });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
};

When('the Owner renames the first line to {string}', async function (description) {
  await editInvoice.call(this, { items: [{ description }] });
});

When('the Owner tries to change the rate while renaming the line', async function () {
  await editInvoice.call(this, {
    items: [{ description: 'Renamed', rate: 1, quantity: 1, discountPercent: 99 }],
  });
});

When('the Owner tries to add a second line', async function () {
  await editInvoice.call(this, {
    items: [{ description: 'One' }, { description: 'Two' }],
  });
});

Then('the line should read {string}', async function (description) {
  const invoice = await readInvoice(this);
  expect(invoice?.items?.[0]?.description).toBe(description);
});

Then('the invoice should still come to {int}', async function (total) {
  const invoice = await readInvoice(this);
  expect(Number(invoice?.total), 'the total moved when only the wording should have').toBe(total);
});

Then('the change should be refused', function () {
  expect(this.response.status()).toBe(409);
});

Then('the Owner should be able to delete it', async function () {
  const client = await this.api('Owner');
  const response = await client.delete(`${API_URL}/oms/invoices/${this.invoiceNumber}`);
  await client.dispose();
  expect(response.status()).toBe(200);
});

Given('the Accountant approves it', async function () {
  const client = await this.api('Accountant');
  const response = await client.patch(`${API_URL}/oms/invoices/${this.invoiceNumber}/account-approval`, {
    data: { status: 'Approved' },
  });
  await client.dispose();
  expect(response.status()).toBe(200);
});

Then('deleting it should be refused', async function () {
  const client = await this.api('Owner');
  const response = await client.delete(`${API_URL}/oms/invoices/${this.invoiceNumber}`);
  const body = await response.json().catch(() => null);
  await client.dispose();
  expect(response.status(), 'an approved invoice was deleted').toBe(409);
  expect(String(body?.message)).toMatch(/approved/i);
});

// The timeline showed a hollow marker and a dash whatever the invoice's state.
Then('the timeline should record who approved it and when', async function () {
  const invoice = await readInvoice(this);
  expect(invoice?.accountApprovedBy, 'nobody was recorded as approving it').toBeTruthy();
  expect(invoice?.accountApprovedAt, 'no approval time was recorded').toBeTruthy();
});

// The document itself, rendered by the same template the email carries.
const invoiceDocument = async (world, { total, paid }) => {
  const client = await world.api('Store Manager');
  const response = await client.post(`${API_URL}/oms/invoices/html-preview`, {
    data: {
      invoiceNumber: `INVDOC${Date.now().toString().slice(-6)}`,
      customer: { name: 'Document Check', phone: '08110000000' },
      items: [{ description: 'Document check suit', rate: total, quantity: 1, amount: total }],
      subtotal: total,
      balanceDue: total,
      amountReceived: paid,
      paymentStatus: paid >= total ? 'fully_paid' : 'partial_paid',
      paymentMethod: 'transfer',
    },
  });
  const html = await response.text();
  await client.dispose();
  return html;
};

const naira = (amount) => `₦${Number(amount).toLocaleString('en-NG')}`;

When('an invoice for {int} is raised as fully paid', async function (total) {
  this.invoiceTotal = total;
  this.invoiceHtml = await invoiceDocument(this, { total, paid: total });
});

When('an invoice for {int} is raised with {int} paid', async function (total, paid) {
  this.invoiceTotal = total;
  this.invoiceHtml = await invoiceDocument(this, { total, paid });
});

// Nothing on a settled invoice — the document, the totals box or the line the
// inbox shows before it is opened — may still ask for the money.
Then('the invoice document should not say {int} is due', function (amount) {
  const dueBlocks = this.invoiceHtml.match(/Balance due[\s\S]{0,240}?<\/(strong|div|p)>/gi) || [];
  dueBlocks.forEach((block) => {
    expect(block, `the document still asks for ${naira(amount)} on an invoice paid in full`)
      .not.toContain(naira(amount));
  });
  expect(this.invoiceHtml, 'a settled invoice should say so').toContain('Paid In Full');
});

Then('the invoice document should show {int} as paid', function (amount) {
  expect(this.invoiceHtml).toContain('Amount paid');
  expect(this.invoiceHtml).toContain(naira(amount));
});

Then('the invoice document should say {int} is due', function (amount) {
  const dueBlocks = this.invoiceHtml.match(/Balance Due[\s\S]{0,240}?<\/(strong|div)>/gi) || [];
  expect(dueBlocks.some((block) => block.includes(naira(amount))), `no balance of ${naira(amount)} on the document`).toBe(true);
});
