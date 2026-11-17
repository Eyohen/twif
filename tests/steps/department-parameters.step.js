import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { API_URL } from '../support/world.js';

async function suit(world, roleName = 'Owner') {
  const client = await world.api(roleName);
  const body = await (await client.get(`${API_URL}/oms/departments`)).json();
  await client.dispose();
  const department = (body?.data?.departments || []).find((entry) => entry.key === 'suit');
  expect(department, 'there is no Suit department').toBeTruthy();
  return department;
}

async function save(world, roleName, department, fields) {
  const client = await world.api(roleName);
  world.attempt = await client.patch(`${API_URL}/oms/departments/${department.id}`, { data: { fields } });
  world.attemptBody = await world.attempt.json().catch(() => ({}));
  await client.dispose();
}

When('the Owner moves the last parameter of the Suit department to the top', async function () {
  const department = await suit(this);
  this.originalFields = department.fields;
  const movable = department.fields.filter((field) => field.key !== 'additionalInformation');
  this.movedKey = movable[movable.length - 1].key;
  const reordered = [movable[movable.length - 1], ...movable.slice(0, -1), ...department.fields.filter((field) => field.key === 'additionalInformation')];
  await save(this, 'Owner', department, reordered);
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
});

Then('the Suit department should list that parameter first', async function () {
  const department = await suit(this);
  expect(department.fields[0].key).toBe(this.movedKey);
});

Then('Additional Information should still be last', async function () {
  const department = await suit(this);
  expect(department.fields[department.fields.length - 1].key).toBe('additionalInformation');
});

Then('the Owner puts the Suit parameters back as they were', async function () {
  const department = await suit(this);
  await save(this, 'Owner', department, this.originalFields);
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
  const again = await suit(this);
  expect(again.fields.map((field) => field.key)).toEqual(this.originalFields.map((field) => field.key));
});

When('the Owner adds a parameter {string} to the Suit department and places it second', async function (label) {
  const department = await suit(this);
  this.originalFields = department.fields;
  const movable = department.fields.filter((field) => field.key !== 'additionalInformation');
  const fields = [movable[0], { label, required: false }, ...movable.slice(1), ...department.fields.filter((field) => field.key === 'additionalInformation')];
  await save(this, 'Owner', department, fields);
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
});

Then('the Suit department should list {string} second', async function (label) {
  const department = await suit(this);
  expect(department.fields[1].label).toBe(label);
});

Then('the Owner removes the {string} parameter again', async function (label) {
  const department = await suit(this);
  await save(this, 'Owner', department, department.fields.filter((field) => field.label !== label));
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
  const again = await suit(this);
  expect(again.fields.map((field) => field.key)).toEqual(this.originalFields.map((field) => field.key));
});

When('the Production Manager tries to reorder the Suit parameters', async function () {
  const department = await suit(this);
  await save(this, 'Production Manager', department, [...department.fields].reverse());
});

When('the Admin reverses the order of the Suit parameters', async function () {
  const department = await suit(this);
  this.originalFields = department.fields;
  const movable = department.fields.filter((field) => field.key !== 'additionalInformation');
  await save(this, 'Administrator', department, [...movable.reverse(), ...department.fields.filter((field) => field.key === 'additionalInformation')]);
});

Then('the request should be accepted', function () {
  expect(this.attempt.status(), JSON.stringify(this.attemptBody)).toBe(200);
});

When('the Admin tries to rename the first Suit parameter', async function () {
  const department = await suit(this);
  const renamed = department.fields.map((field, index) => (index === 0 ? { ...field, label: 'Renamed by admin' } : field));
  await save(this, 'Administrator', department, renamed);
});
