import { When, Then } from '@cucumber/cucumber';
import { expect, request } from '@playwright/test';
import { ACCOUNTS, API_URL } from '../support/world.js';

When('I ask the API for the customer list with no token', async function () {
  const client = await request.newContext();
  this.response = await client.get(`${API_URL}/oms/customers`);
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

When('I ask the API for the customer list with a made-up token', async function () {
  const client = await request.newContext({
    extraHTTPHeaders: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.made.up' },
  });
  this.response = await client.get(`${API_URL}/oms/customers`);
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

When('I ask the API for the customer list as the {word} {word}', async function (first, second) {
  const client = await this.api(`${first} ${second}`);
  this.response = await client.get(`${API_URL}/oms/customers`);
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

Then('the API should refuse me', function () {
  expect(this.response.status(), `the API answered ${this.response.status()} to a caller it should not know`).toBe(401);
  expect(this.body?.success).toBe(false);
});

Then('the API should answer', function () {
  expect(this.response.status()).toBe(200);
  expect(Array.isArray(this.body?.data?.customers)).toBe(true);
});

When('I try to sign in with the wrong PIN', async function () {
  const client = await request.newContext();
  this.response = await client.post(`${API_URL}/oms/auth/login`, {
    data: { phone: ACCOUNTS.Owner.phone, pin: 'definitely-not-the-pin' },
  });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

Then('I should not be signed in', function () {
  expect(this.response.status()).toBe(401);
  expect(this.body?.data?.token, 'a token was handed out for a wrong PIN').toBeFalsy();
});

// Saying which half was wrong would let someone work out which numbers belong
// to real members of staff.
Then('the reason should not say which of the two was wrong', function () {
  const message = String(this.body?.message || '').toLowerCase();
  expect(message).not.toMatch(/no such|unknown (number|phone|user)|not found|wrong pin|incorrect pin/);
});
