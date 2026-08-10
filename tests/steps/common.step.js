import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ACCOUNTS } from '../support/world.js';

Given('I am signed in as the {word}', async function (role) {
  await this.signInAs(role);
});

Given('I am signed in as the {word} {word}', async function (first, second) {
  await this.signInAs(`${first} ${second}`);
});

// The sign-in feature is about the form itself, so it uses it.
Given('I sign in through the form as the {word}', async function (role) {
  await this.signIn(role);
});

Given('I sign in through the form as the {word} {word}', async function (first, second) {
  await this.signIn(`${first} ${second}`);
});

Given('I open the {word} page', async function (view) {
  await this.page.goto(this.rolePath(view));
  await this.page.waitForLoadState('networkidle');
});

Given('I open the {word} {word} page', async function (first, second) {
  await this.page.goto(this.rolePath(`${first} ${second}`));
  await this.page.waitForLoadState('networkidle');
});

Then('the page should belong to the {word}', async function (role) {
  await expect(this.page).toHaveURL(new RegExp(`${ACCOUNTS[role].home}$`));
});

Then('the page should belong to the {word} {word}', async function (first, second) {
  const role = `${first} ${second}`;
  await expect(this.page).toHaveURL(new RegExp(`${ACCOUNTS[role].home}$`));
});

// Identity moved out of the top-right corner to sit with the account actions.
Then('my name should be shown at the foot of the sidebar', async function () {
  const identity = this.page.locator('.sidebar-identity .user-identity strong');
  await expect(identity).toHaveText(this.account.name);
});

When('I click the notification bell', async function () {
  await this.page.locator('.notification-bell').click();
});

Then('I should be on the notifications page', async function () {
  await expect(this.page).toHaveURL(/\/notifications$/);
  await expect(this.page.locator('h1')).toHaveText(/notifications/i);
});

Then('the screen should not scroll sideways', async function () {
  const overflow = await this.horizontalOverflow();
  expect(overflow, `the screen overflows by ${overflow}px`).toBeLessThanOrEqual(1);
});

Then('I should see {string}', async function (text) {
  expect(await this.bodyText()).toContain(text);
});

Then('I should not see {string}', async function (text) {
  expect(await this.bodyText()).not.toContain(text);
});
