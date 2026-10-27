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

When('the Owner opens the actions for a non-owner staff account', async function () {
  const row = this.page.locator('tbody tr').filter({ hasText: 'Accountant' }).first();
  await expect(row, 'no non-owner staff row was available').toBeVisible();
  await row.getByRole('button', { name: /open actions/i }).click();
});

Then('a permanent Delete action should be available', async function () {
  await expect(this.page.getByRole('button', { name: /^delete$/i })).toBeVisible();
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

Given('a staff account whose status can be changed', async function () {
  this.statusProbe = probeAccount();
  const owner = await this.api('Owner');
  const response = await owner.post(`${API_URL}/oms/staff`, { data: this.statusProbe });
  const body = await response.json();
  await owner.dispose();
  this.statusProbeId = body?.data?.staffUser?.id;
  expect(response.status(), body?.message || 'the status probe could not be created').toBe(201);
  expect(this.statusProbeId).toBeTruthy();
});

When('the Owner deactivates that staff account', async function () {
  const owner = await this.api('Owner');
  const response = await owner.patch(`${API_URL}/oms/staff/${this.statusProbeId}`, {
    data: { status: 'inactive' },
  });
  this.statusPatchBody = await response.json();
  await owner.dispose();
  expect(response.status(), this.statusPatchBody?.message || 'the status change was refused').toBe(200);
  expect(this.statusPatchBody?.data?.staffUser?.status).toBe('inactive');
});

Then('a fresh staff list should show that account as inactive', async function () {
  const owner = await this.api('Owner');
  const response = await owner.get(`${API_URL}/oms/staff?refreshedAt=${Date.now()}`);
  const body = await response.json();
  await owner.dispose();
  const saved = body?.data?.staffUsers?.find((person) => person.id === this.statusProbeId);
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(saved?.status, 'the status reverted in a fresh database-backed list').toBe('inactive');
});

Then('that inactive staff account should not be able to sign in', async function () {
  const anonymous = await request.newContext();
  const response = await anonymous.post(`${API_URL}/oms/auth/login`, {
    data: { phone: this.statusProbe.phone, pin: this.statusProbe.pin },
  });
  await anonymous.dispose();

  const owner = await this.api('Owner');
  await owner.delete(`${API_URL}/oms/staff/${this.statusProbeId}`);
  await owner.dispose();

  expect(response.status(), 'the inactive account was still allowed to sign in').toBe(403);
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
    const tag = `${Date.now()}${STORES.indexOf(store)}`.slice(-7);
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

When('the Owner fills in the Add Staff form', async function () {
  const page = this.page;
  await page.getByRole('button', { name: /add staff/i }).first().click();

  const tag = String(Date.now()).slice(-7);
  this.newStaffName = `Form Check ${tag}`;
  this.newStaffPhone = `0816${tag}`;

  const fill = async (label, value) => {
    const field = page.locator('label').filter({ hasText: new RegExp(label, 'i') }).first();
    await field.locator('input').first().fill(value);
  };
  await fill('Full Name', this.newStaffName);
  await fill('Display Name', this.newStaffName);
  await fill('Phone', this.newStaffPhone);
  await fill('Initial PIN', 'check26');
  await fill('Confirm PIN', 'check26');

  await page.locator('label').filter({ hasText: /Role/i }).first().locator('select').selectOption('accounts');
  await page.locator('label').filter({ hasText: /Assigned Store/i }).first().locator('select').selectOption('lekki');

  await page.getByRole('button', { name: /^(create|save|add) /i }).last().click();
  await page.waitForTimeout(2500);
});

// Checked against the shop's records, not against what the screen says.
Then('the new member of staff should appear on the staff list', async function () {
  const client = await this.api('Owner');
  const response = await client.get(`${API_URL}/oms/staff`);
  const staff = ((await response.json())?.data?.staffUsers || []);
  const made = staff.find((person) => person.displayName === this.newStaffName);

  expect(made, `no staff member called ${this.newStaffName} reached the records`).toBeTruthy();
  expect(made.store).toBe('lekki');

  await client.delete(`${API_URL}/oms/staff/${made.id}`);
  await client.dispose();
});

Given('a staff account with a separate full name and display name', async function () {
  const tag = String(Date.now()).slice(-7);
  this.nameProbe = {
    fullName: `Complete Legal Name ${tag}`,
    displayName: `Work Name ${tag}`,
    phone: `0815${tag}`,
    pin: 'probe26',
    role: 'accounts',
    store: 'all',
  };
  const owner = await this.api('Owner');
  const response = await owner.post(`${API_URL}/oms/staff`, { data: this.nameProbe });
  const body = await response.json();
  await owner.dispose();
  this.nameProbeId = body?.data?.staffUser?.id;
  expect(response.status(), body?.message || 'the name probe could not be created').toBe(201);
  expect(body?.data?.staffUser?.fullName).toBe(this.nameProbe.fullName);
  expect(body?.data?.staffUser?.displayName).toBe(this.nameProbe.displayName);
});

When('the Owner edits both names independently', async function () {
  this.editedFullName = `${this.nameProbe.fullName} Updated`;
  this.editedDisplayName = `${this.nameProbe.displayName} Short`;
  const owner = await this.api('Owner');
  const response = await owner.patch(`${API_URL}/oms/staff/${this.nameProbeId}`, {
    data: { fullName: this.editedFullName, displayName: this.editedDisplayName },
  });
  const body = await response.json();
  await owner.dispose();
  expect(response.status(), body?.message || 'the independent names could not be saved').toBe(200);
});

When('the Owner edits both names from the staff profile', async function () {
  this.editedFullName = `${this.nameProbe.fullName} Updated`;
  this.editedDisplayName = `${this.nameProbe.displayName} Short`;

  // User Management loads alongside the dashboard's other owner data. Wait
  // for its own request instead of racing the temporary loading/empty state.
  // Refresh is also part of this regression: the values must come back from
  // storage, not merely remain in React state after saving.
  await this.page.getByRole('button', { name: /^refresh$/i }).click();
  await expect(
    this.page.getByText(this.nameProbe.displayName, { exact: true }).first(),
    `staff page after refresh:\n${await this.bodyText()}`,
  ).toBeVisible({ timeout: 20000 });
  const search = this.page.getByPlaceholder(/search by name/i);
  await search.fill(this.nameProbe.displayName);
  const row = this.page.locator('tbody tr').filter({ hasText: this.nameProbe.displayName }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /open actions/i }).click();
  await this.page.getByRole('button', { name: /^edit$/i }).click();

  const fullName = this.page.getByLabel(/^full name/i);
  const displayName = this.page.getByLabel(/^display name/i);
  await expect(fullName).toHaveValue(this.nameProbe.fullName);
  await expect(displayName).toHaveValue(this.nameProbe.displayName);
  await fullName.fill(this.editedFullName);
  await displayName.fill(this.editedDisplayName);
  await this.page.getByRole('button', { name: /save changes/i }).click();
});

Then('the profile should show both edited names independently', async function () {
  await expect(this.page.getByRole('heading', { name: this.editedDisplayName })).toBeVisible();
  await expect(this.page.getByText(this.editedFullName, { exact: true })).toBeVisible();
});

Then('a fresh staff list should retain both names independently', async function () {
  const owner = await this.api('Owner');
  const response = await owner.get(`${API_URL}/oms/staff?refreshedAt=${Date.now()}`);
  const body = await response.json();
  const saved = body?.data?.staffUsers?.find((person) => person.id === this.nameProbeId);
  await owner.delete(`${API_URL}/oms/staff/${this.nameProbeId}`);
  await owner.dispose();
  expect(saved?.fullName).toBe(this.editedFullName);
  expect(saved?.displayName).toBe(this.editedDisplayName);
});
