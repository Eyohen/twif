import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ACCOUNTS, API_URL } from '../support/world.js';

const NOTES = 'Charcoal wool, half-lined, 3.2m main fabric';

const readOrder = async (world) => {
  const client = await world.api();
  const body = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  return (body?.data?.invoices || []).find((invoice) => invoice.invoiceNumber === world.fabricInvoice);
};

Given('an approved order whose garment has design notes and no tailor yet', async function () {
  const stamp = Date.now().toString().slice(-6);
  const invoiceNumber = `INVFAB${stamp}`;
  const customer = `Fabric Customer ${stamp}`;
  const client = await this.api();

  const departments = (await (await client.get(`${API_URL}/oms/departments`)).json())?.data?.departments || [];
  // One the seeded tailor works in, so the assignment later is accepted.
  const staff = (await (await client.get(`${API_URL}/oms/staff`)).json())?.data?.staffUsers || [];
  const tailor = staff.find((member) => member.displayName === ACCOUNTS.Tailor.name && member.role === 'tailor');
  const theirs = new Set([...(tailor?.tailorDepartments || []), tailor?.tailorDepartment].filter(Boolean));
  const department = departments.find((entry) => entry.status === 'active' && theirs.has(entry.key));
  expect(department, `the seeded tailor works in ${[...theirs].join(', ') || 'no department'}`).toBeTruthy();
  // The order sheet is refused unless every required detail is filled in.
  const required = Object.fromEntries((department.fields || []).filter((field) => field.required).map((field) => [field.key, 'Test']));
  this.fabricDepartment = department.key;

  await client.post(`${API_URL}/oms/invoices/send-email`, {
    data: {
      store: 'lekki', invoiceNumber,
      customer: { name: customer, email: `fab.${stamp}@twif.test`, phone: `0818${stamp}0` },
      items: [{ description: 'Fabric test suit', quantity: 1, rate: 50000, amount: 50000 }],
      subtotal: 50000, balanceDue: 50000, paymentStatus: 'partial_paid', paymentMethod: 'transfer',
      recipientEmail: `fab.${stamp}@twif.test`, amountReceived: 35000,
      paymentEvidence: [{ name: 'receipt.png', type: 'image/png', size: 70, dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }],
    },
  });
  const sheet = await client.post(`${API_URL}/oms/tracking/order-sheet`, {
    data: {
      invoiceNumber,
      orderSheet: {
        item: 'Fabric test suit', customer, measurements: 'Chest 40, Waist 34',
        items: [{ item: 'Fabric test suit', pieces: 1, designNotes: NOTES, departments: [department.key], departmentFields: { [department.key]: required } }],
      },
    },
  });
  expect(sheet.ok(), JSON.stringify(await sheet.json().catch(() => ({})))).toBe(true);
  await client.patch(`${API_URL}/oms/invoices/${invoiceNumber}/account-approval`, { data: { status: 'Approved' } });
  await client.dispose();
  this.fabricInvoice = invoiceNumber;
  this.order = await readOrder(this);
  expect(this.order?.orderSheet?.items?.[0]?.designNotes).toBe(NOTES);
});

Then('I should see the design notes in the job details', async function () {
  const dialog = this.page.getByRole('dialog', { name: /production job details/i });
  await expect(dialog.getByText(NOTES)).toBeVisible();
});

When('I open that order in Assign Fabric', async function () {
  await this.page.goto(`${this.rolePath('Assign Fabric')}?invoice=${this.fabricInvoice}`);
  await this.page.waitForLoadState('networkidle');
});

Then('I should see the design notes on the Assign Fabric page', async function () {
  await expect(this.page.getByText('Design notes from the Store Manager')).toBeVisible({ timeout: 15000 });
  await expect(this.page.getByText(NOTES)).toBeVisible();
});

When('I choose some fabric for the garment and release it', async function () {
  const picker = this.page.getByLabel('Add fabric for Fabric test suit');
  const option = picker.locator('option:not([disabled])').nth(1);
  await expect(option, 'no fabric with stock to choose').toHaveCount(1);
  await picker.selectOption(await option.getAttribute('value'));
  await this.page.getByLabel(/How much .* this garment needs/).fill('0.01');
  await this.page.getByRole('button', { name: /^release fabric$/i }).click();
});

Then('the garment should read as released', async function () {
  await expect(this.page.getByText(/released for Fabric test suit/i)).toBeVisible({ timeout: 15000 });
  await expect(this.page.getByText('Released', { exact: true })).toBeVisible();
});

Then('the order should still have no tailor and still be ready to assign', async function () {
  const order = await readOrder(this);
  expect(order.orderSheet.items[0].fabricAllocated).toBe(true);
  expect(order.orderSheet.status).toBe('Order Sheet Confirmed');
  expect(order.orderSheet.tailor || 'Unassigned').toBe('Unassigned');
  expect(order.orderSheet.items[0].tailors || []).toHaveLength(0);
});

When('Production assigns a tailor to that garment', async function () {
  const client = await this.api('Production Manager');
  const response = await client.patch(`${API_URL}/oms/jobs/${this.fabricInvoice}/assignments`, {
    data: { items: [{ index: 0, tailors: [ACCOUNTS.Tailor.name] }] },
  });
  const body = await response.json().catch(() => ({}));
  await client.dispose();
  this.assignment = { status: response.status(), body };
});

Then('the garment should keep its released fabric and have the tailor', async function () {
  expect(this.assignment.status, JSON.stringify(this.assignment.body)).toBe(200);
  const order = await readOrder(this);
  expect(order.orderSheet.items[0].fabricAllocated).toBe(true);
  expect(order.orderSheet.items[0].tailors).toContain(ACCOUNTS.Tailor.name);
});

Then("the fabric record should name that tailor instead of 'not assigned yet'", async function () {
  const client = await this.api('Inventory Manager');
  const body = await (await client.get(`${API_URL}/oms/fabrics/allocations`)).json();
  await client.dispose();
  const mine = (body?.data?.allocations || []).filter((entry) => entry.invoiceNumber === this.fabricInvoice);
  expect(mine.length, 'the release left no fabric record').toBeGreaterThan(0);
  for (const entry of mine) expect(entry.tailorName).toBe(ACCOUNTS.Tailor.name);
});
