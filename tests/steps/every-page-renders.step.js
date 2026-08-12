import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { navByRole } from '../../src/config/oms.js';
import { APP_URL, VIEW_PATHS } from '../support/world.js';

// The menu each role is given is read from the app's own configuration rather
// than listed here, so a page added to a menu is covered the day it is added.

When('the {} opens every page in their menu', async function (roleName) {
  await this.signInAs(roleName);

  // React reports a component that throws during render on the console. That is
  // the only outward sign of the failure this feature exists to catch.
  this.renderErrors = [];
  this.page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/is not defined|The above error occurred|Minified React error/.test(text)) {
      this.renderErrors.push(text.split('\n')[0].slice(0, 200));
    }
  });

  const account = this.account;
  const base = account.home.split('/')[1];
  this.pageReports = [];

  for (const view of navByRole[account.role] || []) {
    const slug = VIEW_PATHS[view];
    if (!slug) {
      // A view in a menu with no route is itself a fault worth reporting.
      this.pageReports.push({ view, rendered: 0, note: 'no route known for this view' });
      continue;
    }
    await this.page.goto(`${APP_URL}/${base}/${slug}`);
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(700);

    const rendered = await this.page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return main.innerText.trim().length;
    });
    this.pageReports.push({ view, rendered });
  }
});

// A page that paints nothing is the shape of this failure: the component threw,
// React unmounted the tree, and what is left is the chrome around an empty area.
Then('every one should render something', function () {
  const blank = this.pageReports.filter((report) => report.rendered < 40);
  expect(
    blank,
    `these pages rendered nothing: ${blank.map((report) => `${report.view}${report.note ? ` (${report.note})` : ''}`).join(', ')}`,
  ).toEqual([]);
});

Then('none of them should have thrown', function () {
  expect(this.renderErrors, `React reported: ${this.renderErrors.join(' | ')}`).toEqual([]);
});
