import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

Then('it should be the most recently updated invoice in the register', async function () {
  const client = await this.api('Accountant');
  const body = await (await client.get(`${API_URL}/oms/invoices/sent`)).json();
  await client.dispose();
  const invoices = body?.data?.invoices || [];
  const latest = [...invoices].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
  expect(latest.updatedAt, 'invoices carry no updatedAt').toBeTruthy();
  expect(latest.invoiceNumber).toBe(this.invoiceNumber);
});

When('the Inventory Manager renames an item to the name of another item', async function () {
  const client = await this.api('Inventory Manager');
  const list = await (await client.get(`${API_URL}/oms/fabrics`)).json();
  const items = list?.data?.fabrics || [];
  expect(items.length, 'needs two items').toBeGreaterThan(1);
  this.takenName = items[1].name;
  this.takenBy = items[1].id;
  this.attempt = await client.patch(`${API_URL}/oms/fabrics/${items[0].id}`, { data: { name: this.takenName } });
  this.attemptBody = await this.attempt.json().catch(() => ({}));
  await client.dispose();
});

Then('the refusal should name the item that already has that name', async function () {
  expect(this.attempt.status()).toBe(409);
  expect(this.attemptBody.message).not.toBe('Resource already exists');
  expect(this.attemptBody.message).toContain(this.takenName);
});
