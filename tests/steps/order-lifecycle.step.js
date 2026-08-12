import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ACCOUNTS, API_URL, APP_URL } from '../support/world.js';

// The production board sorts jobs by these, and only these. A job holding any
// other value falls out of every count on the board.
const BOARD_STATES = ['Order Sheet Confirmed', 'Assigned', 'In Progress', 'Ready'];

// Reads the order back from the server rather than from the page, so each
// assertion is about what TWIF actually stored. The API is staff-only now, so
// these calls carry a token like any other.
async function invoices(world) {
  const client = await world.api();
  const response = await client.get(`${API_URL}/oms/invoices/sent`);
  const body = await response.json();
  await client.dispose();
  return body?.data?.invoices || [];
}

async function fetchInvoice(world, invoiceNumber) {
  return (await invoices(world)).find((invoice) => invoice.invoiceNumber === invoiceNumber);
}

async function findInvoiceForCustomer(world, customer) {
  return (await invoices(world)).find((invoice) => invoice.customer === customer);
}

Given('the Store Manager creates a customer', async function () {
  // One order per run, named so it can be picked out of the shop's real data.
  this.runTag = Date.now().toString().slice(-6);
  this.customerName = `E2E Customer ${this.runTag}`;
  this.customerPhone = `0810${this.runTag}0`;
  // example.com is reserved for documentation, so the invoice email cannot
  // reach a real person.
  this.customerEmail = `e2e.${this.runTag}@example.com`;

  await this.signInAs('Store Manager');
  await this.page.goto(this.rolePath('Customers'));
  await this.page.getByRole('button', { name: /new customer|add customer/i }).first().click();

  const form = this.page.locator('form').filter({ has: this.page.locator('input[type="email"]') }).first();
  const inputs = form.locator('input');
  await inputs.nth(0).fill(this.customerName);
  await inputs.nth(1).fill(this.customerPhone);
  await inputs.nth(2).fill(this.customerEmail);
  await form.getByRole('button', { name: /create|save|add/i }).last().click();

  await expect(this.page.getByText(new RegExp(`${this.customerName} was created`, 'i'))).toBeVisible({ timeout: 15000 });

  // The shop measures the customer on their profile, and the order sheet reads
  // from there. Taken through the API rather than the measurement screen, which
  // has a feature of its own — this scenario is about the order's journey.
  const client = await this.api('Store Manager');
  const list = await client.get(`${API_URL}/oms/customers`);
  const record = ((await list.json())?.data?.customers || [])
    .find((customer) => customer.fullName === this.customerName);
  expect(record, 'the customer was not created').toBeTruthy();
  await client.patch(`${API_URL}/oms/customers/${record.id}`, {
    data: {
      fullName: this.customerName,
      phone: this.customerPhone,
      email: this.customerEmail,
      measurements: { top_chest: '40', top_shoulder: '18', bottom_waist: '34', bottom_length: '40' },
    },
  });
  await client.dispose();
});

Given('the Store Manager invoices that customer', async function () {
  await this.page.goto(this.rolePath('Invoices'));
  await this.page.getByRole('button', { name: /new invoice/i }).first().click();
  await this.page.waitForSelector('.invoice-item-fields', { timeout: 15000 });

  await this.page.getByPlaceholder(/Search or type customer/).fill(this.customerName);
  await this.page.getByPlaceholder('e.g. 08012345678').fill(this.customerPhone);
  await this.page.getByPlaceholder('customer@email.com').fill(this.customerEmail);

  const item = this.page.locator('.invoice-item-fields').first();
  await item.locator('input').nth(0).fill('Three-piece suit');
  await item.locator('input').nth(1).fill('150000');

  // A part payment, because an unpaid order is now held out of production —
  // this scenario is about an order that travels the whole way. The figure has
  // to clear the release threshold, so it pays the 80% the invoice asks for.
  await this.page.locator('label').filter({ hasText: 'Payment Status' })
    .locator('select').selectOption('partial_paid');
  await this.page.locator('label').filter({ hasText: 'Payment Method' })
    .locator('select').selectOption('transfer');
  await this.page.locator('label').filter({ hasText: 'Amount Received' })
    .locator('input').fill('120000');

  // A part-paid invoice has to carry evidence of the payment. Scoped to the
  // Payment Evidence field: a bare input[type=file] also matches the profile
  // photo control that now sits in the sidebar.
  await this.page.locator('label').filter({ hasText: 'Payment Evidence' })
    .locator('input[type="file"]').setInputFiles({
    name: 'payment-evidence.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await this.page.waitForTimeout(500);

  await this.page.getByRole('button', { name: /send invoice/i }).click();

  // The invoice number is assigned by the form, so it is read back from the
  // server against the customer we just created.
  await expect(async () => {
    const invoice = await findInvoiceForCustomer(this, this.customerName);
    expect(invoice, 'the invoice never reached the server').toBeTruthy();
    this.invoiceNumber = invoice.invoiceNumber;
    this.trackingToken = invoice.trackingToken;
  }).toPass({ timeout: 25000 });
});

Given('the Store Manager raises an order sheet with fabric and measurements', async function () {
  await this.page.goto(this.rolePath('Order Sheet'));
  await this.page.waitForLoadState('networkidle');

  // Link the sheet to the invoice just sent. The picker is found by its own
  // label rather than by position, so another select cannot stand in for it.
  const invoicePicker = this.page.locator('label').filter({ hasText: 'Invoice Number' }).locator('select');
  await invoicePicker.selectOption(this.invoiceNumber);
  await this.page.waitForTimeout(800);

  const fillLabelled = async (label, value) => {
    const field = this.page.locator('label').filter({ hasText: label }).first();
    const box = field.locator('input, textarea').first();
    if (await box.count()) await box.fill(value);
  };

  await fillLabelled('Garment', 'Three-piece suit');
  await fillLabelled('Item', 'Three-piece suit');
  // Measurements are no longer typed onto the sheet — they come from the
  // customer's profile, where the shop took them.
  await fillLabelled('Design', 'Notch lapel, single vent');
  await fillLabelled('Delivery', new Date(Date.now() + 12096e5).toISOString().slice(0, 10));

  // Fabric comes from stock, so whatever the shop actually holds is chosen.
  const fabricPicker = this.page.locator('label').filter({ hasText: 'Fabric' }).locator('select').first();
  if (await fabricPicker.count()) {
    const values = await fabricPicker.locator('option').evaluateAll((options) => options
      .map((option) => option.value).filter(Boolean));
    if (values.length) await fabricPicker.selectOption(values[0]);
  }

  await this.page.getByRole('button', { name: /save order sheet|create order sheet|release/i }).first().click();
  await expect(this.page.getByText(/order sheet saved/i)).toBeVisible({ timeout: 20000 });
});

Then('the order should be waiting on Accounts', async function () {
  const invoice = await fetchInvoice(this, this.invoiceNumber);
  expect(invoice.accountApprovalStatus).toBe('Pending Accounts');
  expect(invoice.orderSheet, 'no order sheet was stored against the invoice').toBeTruthy();
});

When('the Accountant approves the invoice', async function () {
  await this.signInAs('Accountant');
  await this.page.goto(this.rolePath('Invoices'));
  await this.page.waitForLoadState('networkidle');

  await this.page.getByPlaceholder(/search invoice or customer/i).fill(this.invoiceNumber);
  await this.page.waitForTimeout(600);
  await this.page.locator('.accounts-invoice-table tbody button').first().click();
  await this.page.waitForSelector('.review-invoice-grid', { timeout: 15000 });

  await this.page.getByRole('button', { name: /^approve$/i }).first().click();
  // Approving releases the job to production, so it asks first.
  await this.page.getByRole('button', { name: /confirm|yes|approve/i }).last().click();

  await expect(async () => {
    const invoice = await fetchInvoice(this, this.invoiceNumber);
    expect(invoice.accountApprovalStatus).toBe('Approved');
  }).toPass({ timeout: 20000 });
});

Then('the order should be released to Production', async function () {
  await this.signInAs('Production Manager');
  await this.page.goto(this.rolePath('Production'));
  await this.page.waitForLoadState('networkidle');
  await expect(this.page.getByText(this.invoiceNumber).first()).toBeVisible({ timeout: 20000 });
});

When('the Production Manager assigns the job to a tailor', async function () {
  if (this.role !== 'Production Manager') {
    await this.signInAs('Production Manager');
    await this.page.goto(this.rolePath('Production'));
    await this.page.waitForLoadState('networkidle');
  }

  const row = this.page.locator('tr, article').filter({ hasText: this.invoiceNumber }).first();
  await row.getByRole('button', { name: /view/i }).first().click();
  await this.page.waitForSelector('.job-comments', { timeout: 15000 });

  // Assigned to the tailor this suite can sign in as, so the next step is
  // taken by the person the job was actually given to. Assignment is per item
  // now — an order item can be shared between as many as four tailors — so the
  // tailor is picked from the item's own list rather than a single select.
  this.tailorName = ACCOUNTS.Tailor.name;
  const panel = this.page.locator('.tailor-assign-item').first();
  await expect(panel, 'the assignment panel did not open').toBeVisible({ timeout: 15000 });

  const pick = panel.locator('.tailor-assign-picks button', { hasText: this.tailorName }).first();
  await expect(pick, `${this.tailorName} is not on the tailor list`).toBeVisible({ timeout: 15000 });
  await pick.click();
  await expect(pick).toHaveClass(/is-chosen/, { timeout: 15000 });
});

Then('the job should be assigned to that tailor', async function () {
  await expect(async () => {
    const invoice = await fetchInvoice(this, this.invoiceNumber);
    expect(invoice.orderSheet?.tailor).toBe(this.tailorName);
  }).toPass({ timeout: 20000 });
});

When('the tailor starts the job', async function () {
  await this.signInAs('Tailor');
  await this.page.goto(this.rolePath('My Tasks'));
  await this.page.waitForLoadState('networkidle');

  // The task cards carry no class of their own, so the card is the innermost
  // element holding both this customer's name and the button — ancestors match
  // too, and they come first in document order.
  const card = this.page.locator('div')
    .filter({ hasText: this.customerName })
    .filter({ has: this.page.getByRole('button', { name: /start work/i }) })
    .last();
  await card.getByRole('button', { name: /start work/i }).click();
  await this.page.getByRole('button', { name: /yes, start work/i }).click();
  await this.page.waitForTimeout(1500);
});

Then('the job should be in progress', async function () {
  await expect(async () => {
    const invoice = await fetchInvoice(this, this.invoiceNumber);
    expect(invoice.orderSheet?.status).toBe('In Progress');
  }).toPass({ timeout: 20000 });
});

When('the tailor marks the job ready', async function () {
  const card = this.page.locator('div')
    .filter({ hasText: this.customerName })
    .filter({ has: this.page.getByRole('button', { name: /mark ready/i }) })
    .last();
  await card.getByRole('button', { name: /mark ready/i }).click();
  await this.page.getByRole('button', { name: /yes, mark ready/i }).click();
  await this.page.waitForTimeout(1500);
});

Then('the job should be ready for collection', async function () {
  await expect(async () => {
    const invoice = await fetchInvoice(this, this.invoiceNumber);
    expect(invoice.orderSheet?.status).toBe('Ready');
  }).toPass({ timeout: 20000 });
});

When('the customer opens their tracking link', async function () {
  const invoice = await fetchInvoice(this, this.invoiceNumber);
  this.trackingToken = invoice.trackingToken;
  expect(this.trackingToken, 'the order carries no tracking link').toBeTruthy();
  await this.page.goto(`${APP_URL}/c/${this.trackingToken}`);
  await this.page.waitForSelector('.tracking-steps', { timeout: 15000 });
});

Then('the customer should be told the order is ready for collection', async function () {
  const current = this.page.locator('.tracking-step.active');
  await expect(current).toContainText('Ready for Collection');
});

When('the order is read back from the server', async function () {
  this.storedJob = (await fetchInvoice(this, this.invoiceNumber))?.orderSheet;
  expect(this.storedJob, 'no order sheet came back').toBeTruthy();
});

// The status the app saves has to be one production works in. Saving the
// customer-facing label here once dropped the job out of every board count.
Then('the stored job status should be one the production board recognises', function () {
  expect(BOARD_STATES, `the board cannot place a job at "${this.storedJob.status}"`)
    .toContain(this.storedJob.status);
});
