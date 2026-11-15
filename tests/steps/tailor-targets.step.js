import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ACCOUNTS, API_URL } from '../support/world.js';

// The tailor the seeded Tailor account is, found by name so the scenarios do not
// depend on an id.
async function seededTailor(world) {
  const client = await world.api('Owner');
  const body = await (await client.get(`${API_URL}/oms/staff`)).json();
  await client.dispose();
  const tailor = (body?.data?.staffUsers || []).find((person) => person.displayName === ACCOUNTS.Tailor.name);
  expect(tailor, 'the seeded tailor is not on the staff list').toBeTruthy();
  return tailor;
}

async function setTarget(world, roleName, value) {
  const tailor = await seededTailor(world);
  const client = await world.api(roleName);
  world.attempt = await client.patch(`${API_URL}/oms/staff/${tailor.id}`, { data: { weeklyTarget: value } });
  world.attemptBody = await world.attempt.json().catch(() => ({}));
  await client.dispose();
}

When('the Owner sets the tailor\'s weekly target to {int}', async function (value) {
  await setTarget(this, 'Owner', value);
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
});

Then('the tailor\'s weekly target should be {int}', async function (value) {
  const tailor = await seededTailor(this);
  expect(tailor.weeklyTarget).toBe(value);
});

When('the Production Manager tries to set the tailor\'s weekly target to {int}', async function (value) {
  await setTarget(this, 'Production Manager', value);
});

When('the Owner tries to set the tailor\'s weekly target to {int}', async function (value) {
  await setTarget(this, 'Owner', value);
});

Then('the request should be rejected as invalid', async function () {
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(400);
});

When('the Production Manager reads this week\'s targets', async function () {
  const client = await this.api('Production Manager');
  this.targets = await (await client.get(`${API_URL}/oms/tailor-targets`)).json();
  await client.dispose();
});

Then('the tailor\'s row should show a target, a completed count and a status', async function () {
  const row = (this.targets?.data?.tailors || []).find((entry) => entry.name === ACCOUNTS.Tailor.name);
  expect(row, 'the tailor is not on the targets board').toBeTruthy();
  expect(Number.isInteger(row.target) && row.target > 0, 'the tailor has no target').toBe(true);
  expect(Number.isInteger(row.completed)).toBe(true);
  expect(['not_met', 'met', 'exceeded']).toContain(row.status);
});

When('the tailor reads their own weekly record', async function () {
  const client = await this.api('Tailor');
  this.record = await (await client.get(`${API_URL}/oms/tailor-targets/me?weeks=4`)).json();
  await client.dispose();
});

Then('the record should list this week first and carry no management flag', async function () {
  const weeks = this.record?.data?.weeks || [];
  expect(weeks.length).toBeGreaterThan(0);
  expect(weeks[0].closed, 'the first week listed is not the current one').toBe(false);
  expect(this.record.data.flag, 'a tailor should not be shown the management flags').toBeUndefined();
});

When('the tailor tries to read the team\'s targets', async function () {
  const client = await this.api('Tailor');
  this.attempt = await client.get(`${API_URL}/oms/tailor-targets`);
  this.attemptBody = await this.attempt.json().catch(() => ({}));
  await client.dispose();
});
