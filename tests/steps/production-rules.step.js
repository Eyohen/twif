import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ACCOUNTS, API_URL } from '../support/world.js';

// These scenarios are about the rule, not about the screens that reach it, so
// the order is put into the state under test directly and only the rule's
// effect is read from the app.
async function anOrderWith(world, { approval, status, tailor }) {
  const client = await world.api();
  const list = await client.get(`${API_URL}/oms/invoices/sent`);
  const invoices = (await list.json())?.data?.invoices || [];

  let candidate = invoices.find((invoice) => invoice.orderSheet && invoice.trackingToken
    && invoice.accountApprovalStatus === approval);

  // The shop's own data supplies these when it can. When it does not — every
  // pending invoice has been through a previous run, say — the scenario raises
  // the order sheet it needs rather than failing for want of test data.
  if (!candidate) {
    const bare = invoices.find((invoice) => !invoice.orderSheet && invoice.accountApprovalStatus === approval);
    if (!bare) {
      await client.dispose();
      throw new Error(`No invoice is ${approval}, so this rule cannot be checked`);
    }
    await client.post(`${API_URL}/oms/tracking/order-sheet`, {
      data: {
        invoiceNumber: bare.invoiceNumber,
        orderSheet: {
          customer: bare.customer,
          item: bare.item || 'Test garment',
          measurements: 'Chest 40, Waist 34, Length 30',
          delivery: new Date(Date.now() + 12096e5).toISOString().slice(0, 10),
        },
      },
    });
    const refreshed = await client.get(`${API_URL}/oms/invoices/sent`);
    const list = (await refreshed.json())?.data?.invoices || [];
    candidate = list.find((invoice) => invoice.invoiceNumber === bare.invoiceNumber);
    if (!candidate?.orderSheet) {
      await client.dispose();
      throw new Error(`An order sheet could not be raised on ${bare.invoiceNumber}`);
    }
  }

  // An approved order also has to clear the payment gate and carry measurements
  // before it can be worked, and the shop's own records often have neither. The
  // scenarios that expect a workable order settle both first.
  if (approval === 'Approved') {
    const accounts = await world.api('Accountant');
    await accounts.patch(`${API_URL}/oms/invoices/${candidate.invoiceNumber}/payment`, {
      data: { amountReceived: Number(candidate.total || 0) },
    });
    await accounts.dispose();

    if (!String(candidate.orderSheet?.measurements || '').trim()) {
      await client.patch(`${API_URL}/oms/tracking/order-sheet/${candidate.trackingToken}`, {
        data: { measurements: 'Chest 40, Waist 34, Length 30' },
      });
    }
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
  this.order = await anOrderWith(this, { approval: 'Pending Accounts' });
});

Given('an order sheet has been raised and Accounts have approved it', async function () {
  this.order = await anOrderWith(this, { approval: 'Approved' });
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
  this.order = await anOrderWith(this, {
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
async function makeOrder(world, { paymentStatus, measurements, percentPaid }) {
  const client = await world.api();
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
      // The gate measures what was actually received, so a scenario that calls
      // an order paid has to say how much of it.
      amountReceived: percentPaid ? (50000 * percentPaid) / 100 : 0,
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
  this.order = await makeOrder(this, { paymentStatus: 'unpaid', measurements: 'Chest 40, Waist 34' });
  expect(this.order.paymentStatus).toBe('Unpaid');
  expect(this.order.accountApprovalStatus).toBe('Approved');
});

Given('an approved and paid order with no measurements', async function () {
  this.order = await makeOrder(this, { paymentStatus: 'partial_paid', measurements: '', percentPaid: 70 });
  expect(this.order.paymentStatus).toBe('Partial Paid');
  expect(this.order.orderSheet?.measurements ?? '').toBe('');
});

When('the measurements are added', async function () {
  const client = await this.api();
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
  const client = await this.api('Production Manager');
  const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { tailor: ACCOUNTS.Tailor.name },
  });
  const body = await response.json();
  await client.dispose();
  expect(response.status(), `the server allowed it: ${JSON.stringify(body)}`).toBe(409);
  expect(body.success).toBe(false);
});

Then('assigning a tailor to it should be allowed', async function () {
  const client = await this.api('Production Manager');
  const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { tailor: ACCOUNTS.Tailor.name },
  });
  const body = await response.json();
  await client.dispose();
  expect(response.status(), `the server refused it: ${JSON.stringify(body)}`).toBe(200);
});

Given('an approved order with {int}% of the invoice paid', async function (percent) {
  this.order = await makeOrder(this, {
    paymentStatus: percent >= 100 ? 'fully_paid' : 'partial_paid',
    measurements: 'Chest 40, Waist 34',
    percentPaid: percent,
  });
  expect(this.order.accountApprovalStatus).toBe('Approved');
});

// Releasing a held order is the Owner's and Admin's to do. Accounts approving
// the invoice is a different decision, and does not carry this one with it.
Then('the Accountant should not be able to release it', async function () {
  const client = await this.api('Accountant');
  const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { status: 'Assigned', tailor: ACCOUNTS.Tailor.name, overrideProductionHold: true },
  });
  await client.dispose();
  expect(response.status(), 'Accounts released an order the payment gate was holding').toBe(409);
});

Then('the Owner should be able to release it', async function () {
  const client = await this.api('Owner');
  const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${this.order.trackingToken}`, {
    data: { status: 'Assigned', tailor: ACCOUNTS.Tailor.name, overrideProductionHold: true },
  });
  const body = await response.json().catch(() => null);
  await client.dispose();
  expect(response.status(), `the Owner was refused: ${body?.message}`).toBe(200);
  expect(body?.data?.orderSheet?.productionOverride?.by, 'the override was not recorded').toBeTruthy();
});
