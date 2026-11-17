import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ACCOUNTS, API_URL } from '../support/world.js';

const FORGED = '2020-01-01T00:00:00.000Z';

async function sheetOf(world) {
  const client = await world.api('Owner');
  const body = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  return (body?.data?.invoices || []).find((entry) => entry.invoiceNumber === world.order.invoiceNumber);
}

When('the Owner saves the order sheet with a ready date of 1 January 2020', async function () {
  const invoice = await sheetOf(this);
  const client = await this.api('Owner');
  // Once with the status unchanged, once as a finished order: neither may take it.
  for (const status of [invoice.orderSheet.status, 'Completed']) {
    const response = await client.patch(`${API_URL}/oms/tracking/order-sheet/${invoice.trackingToken}`, {
      data: { status, readyAt: FORGED, readyBy: 'Somebody' },
    });
    this.attemptBody = await response.json().catch(() => ({}));
    this.attempt = response;
  }
  await client.dispose();
});

Then('the order sheet should not carry that ready date', async function () {
  const invoice = await sheetOf(this);
  expect(invoice.orderSheet.readyAt, JSON.stringify(this.attemptBody)).not.toBe(FORGED);
  expect(invoice.orderSheet.readyBy).not.toBe('Somebody');
});

When('the Administrator tries to change the tailor\'s role to Store Manager', async function () {
  const owner = await this.api('Owner');
  const staff = (await (await owner.get(`${API_URL}/oms/staff`)).json())?.data?.staffUsers || [];
  await owner.dispose();
  const tailor = staff.find((person) => person.displayName === ACCOUNTS.Tailor.name);
  expect(tailor, 'the seeded tailor is not on the staff list').toBeTruthy();
  const admin = await this.api('Administrator');
  this.attempt = await admin.patch(`${API_URL}/oms/staff/${tailor.id}`, { data: { role: 'store_manager', store: 'lekki' } });
  this.attemptBody = await this.attempt.json().catch(() => ({}));
  await admin.dispose();
});
