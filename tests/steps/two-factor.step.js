import { Given, When, Then } from '@cucumber/cucumber';
import { expect, request } from '@playwright/test';
import * as otp from 'otplib';
import { ACCOUNTS, API_URL } from '../support/world.js';

// These run against the API rather than the sign-in screen: the rule under test
// is what a PIN is worth on its own, which is a server decision. The screen has
// its own coverage in the sign-in feature.

const anon = () => request.newContext();

// Whatever a previous run left behind, each scenario starts from a known state.
// Turning it off is the Owner's to do, and needs no code.
async function clearAdminTwoFactor(world) {
  const owner = await world.api('Owner');
  const list = await owner.get(`${API_URL}/oms/staff`);
  const admin = ((await list.json())?.data?.staffUsers || []).find((person) => person.role === 'admin');
  if (admin) await owner.post(`${API_URL}/oms/auth/2fa/disable`, { data: { staffId: admin.id } });
  await owner.dispose();
  return admin;
}

Given('the Admin has no authenticator set up', async function () {
  this.admin = await clearAdminTwoFactor(this);
  expect(this.admin, 'there is no Admin on the staff list').toBeTruthy();
});

Given('the Admin has an authenticator set up', async function () {
  const client = await anon();
  const login = await client.post(`${API_URL}/oms/auth/login`, {
    data: { phone: ACCOUNTS.Administrator.phone, pin: ACCOUNTS.Administrator.pin },
  });
  const ticket = (await login.json())?.data?.ticket;

  const setup = await client.post(`${API_URL}/oms/auth/2fa/setup`, { data: { ticket } });
  this.secret = (await setup.json())?.data?.secret;
  expect(this.secret, 'no secret came back from setup').toBeTruthy();

  const confirm = await client.post(`${API_URL}/oms/auth/2fa/confirm`, {
    data: { ticket, code: otp.generateSync({ secret: this.secret }) },
  });
  this.recoveryCodes = (await confirm.json())?.data?.recoveryCodes;
  await client.dispose();
  expect(this.recoveryCodes?.length, 'no recovery codes were issued').toBeGreaterThan(0);
});

const signInWithPin = async function (roleName) {
  const account = ACCOUNTS[roleName];
  const client = await anon();
  this.response = await client.post(`${API_URL}/oms/auth/login`, {
    data: { phone: account.phone, pin: account.pin },
  });
  this.body = await this.response.json().catch(() => null);
  this.ticket = this.body?.data?.ticket;
  await client.dispose();
};

// Cucumber matches on the text, not the keyword, so this is defined once and
// the feature reads it as either Given or When.
Given('the Admin signs in with their PIN', async function () { await signInWithPin.call(this, 'Administrator'); });
When('the Tailor signs in with their PIN', async function () { await signInWithPin.call(this, 'Tailor'); });

const sendCode = async function (code, path = 'verify') {
  const client = await anon();
  this.response = await client.post(`${API_URL}/oms/auth/2fa/${path}`, {
    data: { ticket: this.ticket, code },
  });
  this.body = await this.response.json().catch(() => null);
  await client.dispose();
};

When('they scan the barcode and enter a code from the app', async function () {
  const client = await anon();
  const setup = await client.post(`${API_URL}/oms/auth/2fa/setup`, { data: { ticket: this.ticket } });
  const body = await setup.json();
  this.secret = body?.data?.secret;
  // The barcode is the point of this step: it is what an authenticator scans.
  expect(String(body?.data?.qr || ''), 'no barcode was produced').toContain('data:image/png;base64,');
  await client.dispose();

  await sendCode.call(this, otp.generateSync({ secret: this.secret }), 'confirm');
});

When('they enter a code from the app', async function () {
  await sendCode.call(this, otp.generateSync({ secret: this.secret }));
});

When('they enter the wrong code', async function () { await sendCode.call(this, '000000'); });

When('they enter a recovery code', async function () {
  this.usedRecoveryCode = this.recoveryCodes[0];
  await sendCode.call(this, this.usedRecoveryCode);
});

Then('they should not have a session yet', function () {
  expect(this.body?.data?.token, 'a PIN alone handed out a session').toBeFalsy();
  expect(this.body?.data?.twoFactorRequired).toBe(true);
});

Then('they should be asked to set up an authenticator', function () {
  expect(this.body?.data?.enrolled).toBe(false);
  expect(this.body?.data?.ticket, 'no ticket for the second step').toBeTruthy();
});

Then('they should be asked for a code', function () {
  expect(this.body?.data?.enrolled).toBe(true);
});

// The ticket says "this PIN was right"; it is not a key to the shop's records.
Then('the API should refuse that ticket as a session', async function () {
  const client = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${this.ticket}` },
  });
  const response = await client.get(`${API_URL}/oms/customers`);
  await client.dispose();
  expect(response.status(), 'a half-finished sign-in reached the customer list').toBe(401);
});

Then('they should be signed in', function () {
  expect(this.body?.data?.token, `no session came back: ${this.body?.message}`).toBeTruthy();
});

Then('they should be given recovery codes', function () {
  expect(this.body?.data?.recoveryCodes?.length, 'no recovery codes were issued').toBeGreaterThan(0);
});

Then('the code should be refused', function () {
  expect(this.response.status()).toBe(401);
  expect(this.body?.data?.token).toBeFalsy();
});

Then('that same recovery code should not work again', async function () {
  await signInWithPin.call(this, 'Administrator');
  await sendCode.call(this, this.usedRecoveryCode);
  expect(this.response.status(), 'a recovery code worked twice').toBe(401);

  // Left off, so the seeded Admin signs in with a PIN for every other feature.
  await clearAdminTwoFactor(this);
});
