import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { request } from '@playwright/test';
import { APP_URL, API_URL } from '../support/world.js';

// A tracking link belongs to a customer, so these scenarios sign nobody in.
// The token is taken from a real invoice rather than being made up.
async function trackingToken(wantedStatus = null) {
  const api = await request.newContext();
  const response = await api.get(`${API_URL}/oms/invoices/sent`);
  const body = await response.json();

  const invoices = (body?.data?.invoices || []).filter((invoice) => invoice.trackingToken);
  if (!invoices.length) {
    await api.dispose();
    throw new Error('No invoice carries a tracking token');
  }

  if (!wantedStatus) {
    await api.dispose();
    return invoices[0].trackingToken;
  }

  // The invoice's own orderStatus is not what the customer is shown, so the
  // tracking endpoint is asked directly rather than guessed at from the list.
  for (const invoice of invoices) {
    const tracked = await api.get(`${API_URL}/oms/track/${invoice.trackingToken}`);
    if (!tracked.ok()) continue;
    const status = (await tracked.json())?.data?.tracking?.status;
    if (status === wantedStatus) {
      await api.dispose();
      return invoice.trackingToken;
    }
  }

  await api.dispose();
  throw new Error(`No order is currently at "${wantedStatus}", so this scenario has nothing to check`);
}

Given('a customer opens the tracking link for an order that has not started', async function () {
  const token = await trackingToken('Order Received');
  await this.page.goto(`${APP_URL}/c/${token}`);
  await this.page.waitForSelector('.tracking-steps', { timeout: 15000 });
});

Given('a customer opens their profile from the tracking link', async function () {
  const token = await trackingToken();
  await this.page.goto(`${APP_URL}/c/${token}/profile`);
  await this.page.waitForSelector('.client-portal-workspace', { timeout: 15000 });
});

Then('the tracking page should show {string} as the current step', async function (step) {
  const current = this.page.locator('.tracking-step.active');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText(step);
});

Then('the tracking page should offer three steps', async function () {
  await expect(this.page.locator('.tracking-steps .tracking-step')).toHaveCount(3);
});
