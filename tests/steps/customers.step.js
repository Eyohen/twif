import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I start creating a customer', async function () {
  await this.page.getByRole('button', { name: /new customer|add customer/i }).first().click();
  await this.page.waitForSelector('input[type="email"]', { timeout: 15000 });
});

Then('the email field should be required', async function () {
  await expect(this.page.locator('input[type="email"]').first()).toHaveAttribute('required', '');
});

When('I try to save a customer using an address already on file', async function () {
  // Whichever customer is first on the list is the one whose address is reused.
  const existing = await this.page.evaluate(async () => {
    const base = document.querySelector('meta[name="api-base"]')?.content;
    const response = await fetch(`${base || 'http://localhost:8084/api'}/oms/customers`);
    const body = await response.json();
    return (body?.data?.customers || []).find((customer) => customer.email)?.email || '';
  });
  if (!existing) throw new Error('No customer with an email address to duplicate');
  this.duplicateEmail = existing;

  const form = this.page.locator('form').filter({ has: this.page.locator('input[type="email"]') }).first();
  const inputs = form.locator('input');
  await inputs.nth(0).fill('Duplicate Address Test');
  await inputs.nth(1).fill(`0812${Date.now().toString().slice(-7)}`);
  await inputs.nth(2).fill(existing.toUpperCase());
  await form.getByRole('button', { name: /create|save|add/i }).last().click();
  await this.page.waitForTimeout(1500);
});

Then('I should be told the address is taken', async function () {
  const text = await this.bodyText();
  expect(text).toMatch(/already uses/i);
});

// A refusal painted green reads as a confirmation.
Then('the refusal should read as an error, not a success', async function () {
  const colour = await this.page.evaluate(() => {
    const banner = [...document.querySelectorAll('div')]
      .find((el) => /already uses/i.test(el.textContent) && el.children.length === 0);
    return banner ? getComputedStyle(banner).color : null;
  });
  expect(colour, 'no message banner was found').not.toBeNull();
  const [red, green] = colour.match(/\d+/g).map(Number);
  expect(red, `the message is painted ${colour}`).toBeGreaterThan(green);
});

When("I open the first customer's measurements", async function () {
  await this.page.locator('.os-page').getByRole('button', { name: /view|open/i }).first().click();
  await this.page.waitForTimeout(1200);
  const measurements = this.page.getByRole('button', { name: /measurement/i }).first();
  if (await measurements.count()) {
    await measurements.click();
    await this.page.waitForTimeout(1200);
  }
});

Then('no measurement should be filled in', async function () {
  const text = await this.bodyText();
  // The invented defaults that used to arrive with every new customer.
  for (const invented of ['16"', '42"', '34"', '16 in', '42 in']) {
    expect(text, `a measurement of ${invented} appears without anyone taking it`).not.toContain(invented);
  }
});
