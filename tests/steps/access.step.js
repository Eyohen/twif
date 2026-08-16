import { Given, When, Then } from '@cucumber/cucumber';
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

// Staff management carries no credentials in the body any more, so these prove
// the token alone is what authorises it.
const probeAccount = () => {
  const tag = Date.now().toString().slice(-7);
  return { displayName: `Access Probe ${tag}`, phone: `0819${tag}`, pin: 'probe26', role: 'accounts', store: 'all' };
};

When('the Owner adds a staff account', async function () {
  this.probe = probeAccount();
  const client = await this.api('Owner');
  this.response = await client.post(`${API_URL}/oms/staff`, { data: this.probe });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

When('the Store Manager tries to add a staff account', async function () {
  const client = await this.api('Store Manager');
  this.response = await client.post(`${API_URL}/oms/staff`, { data: probeAccount() });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

Then('the account should be created', function () {
  expect(this.response.status(), `the Owner was refused: ${this.body?.message}`).toBe(201);
  this.probeId = this.body?.data?.staffUser?.id;
  expect(this.probeId).toBeTruthy();
});

Then('the Owner should be able to remove it again', async function () {
  const client = await this.api('Owner');
  const response = await client.delete(`${API_URL}/oms/staff/${this.probeId}`);
  await client.dispose();
  expect(response.status()).toBe(200);
});

Then('the API should refuse me as not the Owner', function () {
  expect(this.response.status(), 'a store manager was allowed to create staff').toBe(403);
});

Given('a member of staff is signed in', async function () {
  this.probe = probeAccount();
  const owner = await this.api('Owner');
  const created = await owner.post(`${API_URL}/oms/staff`, { data: this.probe });
  this.probeId = (await created.json())?.data?.staffUser?.id;
  await owner.dispose();
  expect(this.probeId, 'the probe account was not created').toBeTruthy();

  const anon = await request.newContext();
  const login = await anon.post(`${API_URL}/oms/auth/login`, {
    data: { phone: this.probe.phone, pin: this.probe.pin },
  });
  this.probeToken = (await login.json())?.data?.token;
  await anon.dispose();
  expect(this.probeToken, 'the probe account could not sign in').toBeTruthy();
});

When('the Owner resets their PIN', async function () {
  const client = await this.api('Owner');
  const response = await client.patch(`${API_URL}/oms/staff/${this.probeId}`, { data: { pin: 'changed26' } });
  await client.dispose();
  expect(response.status(), 'the PIN could not be reset').toBe(200);
});

// A PIN is usually reset because someone else knows it, so the sessions it
// opened have to go with it.
Then('their old session should stop working', async function () {
  const client = await request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${this.probeToken}` } });
  const response = await client.get(`${API_URL}/oms/customers`);
  await client.dispose();
  expect(response.status(), 'a session opened with the old PIN still works').toBe(401);
});

Then('their old PIN should no longer sign them in', async function () {
  const anon = await request.newContext();
  const response = await anon.post(`${API_URL}/oms/auth/login`, {
    data: { phone: this.probe.phone, pin: this.probe.pin },
  });
  await anon.dispose();
  expect(response.status()).toBe(401);

  // Tidy up, so a run does not leave staff behind.
  const owner = await this.api('Owner');
  await owner.delete(`${API_URL}/oms/staff/${this.probeId}`);
  await owner.dispose();
});

// Staff are attached to one of the shop's stores, to production, or to all of
// them. The form used to offer names like "Victoria Island" — neither a place
// the shop has nor a value the column accepts.
const STORES = ['all', 'lekki', 'ikeja', 'production'];

When('the Owner adds a member of staff to every store in turn', async function () {
  const client = await this.api('Owner');
  this.created = [];
  this.results = [];

  for (const store of STORES) {
    const tag = `${Date.now()}${STORES.indexOf(store)}`.slice(-8);
    const response = await client.post(`${API_URL}/oms/staff`, {
      data: {
        displayName: `Store Probe ${tag}`,
        phone: `0817${tag}`,
        pin: 'probe26',
        role: 'tailor',
        tailorDepartment: 'native',
        store,
      },
    });
    const body = await response.json().catch(() => null);
    this.results.push({ store, status: response.status(), stored: body?.data?.staffUser?.store, message: body?.message });
    if (body?.data?.staffUser?.id) this.created.push(body.data.staffUser.id);
  }
  await client.dispose();
});

When('the Owner adds a member of staff to {string}', async function (store) {
  const client = await this.api('Owner');
  const tag = String(Date.now()).slice(-7);
  this.response = await client.post(`${API_URL}/oms/staff`, {
    data: {
      displayName: `Store Probe ${tag}`,
      phone: `0818${tag}`,
      pin: 'probe26',
      role: 'tailor',
      tailorDepartment: 'native',
      store,
    },
  });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
});

Then('each one should be created', async function () {
  const refused = this.results.filter((result) => result.status !== 201);
  expect(refused, `these were refused: ${refused.map((r) => `${r.store} — ${r.message}`).join('; ')}`).toEqual([]);
  this.results.forEach((result) => expect(result.stored).toBe(result.store));

  // Tidy up, so a run does not leave staff behind.
  const owner = await this.api('Owner');
  for (const id of this.created) await owner.delete(`${API_URL}/oms/staff/${id}`);
  await owner.dispose();
});

// A raw "invalid input value for enum" is not something a person can act on.
Then('the refusal should name the places staff can be assigned', function () {
  expect(this.response.status()).toBe(400);
  const message = String(this.body?.message || '');
  expect(message, `the message was: ${message}`).not.toMatch(/enum|invalid input value/i);
  STORES.forEach((store) => expect(message).toContain(store));
});
