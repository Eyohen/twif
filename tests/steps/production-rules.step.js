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

// "A production job" means one that can actually be worked, so the active queue
// is what is checked — a held order appears on the board, but under Held.
const activeQueue = (page) => page.locator('.os-card').filter({ hasText: 'Active Jobs' });

Then('that order should not be listed as a production job', async function () {
  const queue = await activeQueue(this.page).innerText();
  expect(queue, `${this.order.invoiceNumber} is in the active queue when it should be held`)
    .not.toContain(this.order.invoiceNumber);
});

Then('that order should be listed as a production job', async function () {
  const queue = await activeQueue(this.page).innerText();
  expect(queue, `${this.order.invoiceNumber} is workable but is not in the active queue`)
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

// Builds an order in an exact state through the API, because these scenarios
// are about the rule rather than about the screens that lead to it.
async function makeOrder({ paymentStatus, measurements }) {
  const client = await request.newContext();
  const stamp = Date.now().toString().slice(-6);
  const invoiceNumber = `INVRULE${stamp}`;
  const customer = `Rule Customer ${stamp}`;

  await client.post(`${API_URL}/oms/invoices/send-email`, {
    data: {
      store: 'lekki',
      invoiceNumber,
      customer: { name: customer, email: `rule.${stamp}@twif.test`, phone: `0819${stamp}0` },
      items: [{ description: 'Rule check suit', quantity: 1, rate: 50000, amount: 50000 }],
      subtotal: 50000,
      balanceDue: 50000,
      paymentStatus,
      paymentMethod: 'transfer',
      recipientEmail: `rule.${stamp}@twif.test`,
    },
  });

  await client.post(`${API_URL}/oms/tracking/order-sheet`, {
    data: {
      invoiceNumber,
      orderSheet: {
        item: 'Rule check suit',
        customer,
        ...(measurements ? { measurements } : {}),
      },
    },
  });

  await client.patch(`${API_URL}/oms/invoices/${invoiceNumber}/account-approval`, { data: { status: 'Approved' } });

  const list = await client.get(`${API_URL}/oms/invoices/sent`);
  const invoice = ((await list.json())?.data?.invoices || []).find((item) => item.invoiceNumber === invoiceNumber);
  await client.dispose();
  return invoice;
}

Given('an approved order whose invoice is unpaid', async function () {
  this.order = await makeOrder({ paymentStatus: 'unpaid', measurements: 'Chest 40, Waist 34' });
  expect(this.order.paymentStatus).toBe('Unpaid');
  expect(this.order.accountApprovalStatus).toBe('Approved');
});

Given('an approved and paid order with no measurements', async function () {
  this.order = await makeOrder({ paymentStatus: 'partial_paid', measurements: '' });
  expect(this.order.paymentStatus).toBe('Partial Paid');
  expect(this.order.orderSheet?.measurements ?? '').toBe('');
});

When('the measurements are added', async function () {
  const client = await request.newContext();
  await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { measurements: 'Chest 42, Waist 36, Sleeve 25' },
  });
  await client.dispose();
});

// Held orders are listed with what is holding them, so Production can chase
// them rather than wonder where an order went.
Then('that order should be held with the reason {string}', async function (reason) {
  const held = this.page.locator('.os-card').filter({ hasText: 'Held — cannot start' });
  await expect(held).toBeVisible({ timeout: 15000 });
  const row = held.locator('div').filter({ hasText: this.order.invoiceNumber }).last();
  await expect(row).toContainText(reason);
});

Then('assigning a tailor to it should be refused', async function () {
  const client = await request.newContext();
  const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { tailor: ACCOUNTS.Tailor.name },
  });
  const body = await response.json();
  await client.dispose();
  expect(response.status(), `the server allowed it: ${JSON.stringify(body)}`).toBe(409);
  expect(body.success).toBe(false);
});

Then('assigning a tailor to it should be allowed', async function () {
  const client = await request.newContext();
  const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { tailor: ACCOUNTS.Tailor.name },
  });
  const body = await response.json();
  await client.dispose();
  expect(response.status(), `the server refused it: ${JSON.stringify(body)}`).toBe(200);
});
