import { Given, When, Then } from '@cucumber/cucumber';
import { expect, request } from '@playwright/test';
import { API_URL } from '../support/world.js';

When('I start creating a customer', async function () {
  await this.page.getByRole('button', { name: /new customer|add customer/i }).first().click();
  await this.page.waitForSelector('input[type="email"]', { timeout: 15000 });
});

Then('the email field should be required', async function () {
  await expect(this.page.locator('input[type="email"]').first()).toHaveAttribute('required', '');
});

When('I try to save a customer using an address already on file', async function () {
  // Whichever customer is first on the list is the one whose address is reused.
  // A real customer record, not one the list synthesises from an invoice —
  // only the first kind is checked for a duplicate address.
  const existing = await this.page.evaluate(async () => {
    // The API is staff-only now, so the page's own token goes with the request.
    const response = await fetch('http://localhost:8084/api/oms/customers', {
      headers: { Authorization: `Bearer ${window.localStorage.getItem('twif_access_token')}` },
    });
    const body = await response.json();
    return (body?.data?.customers || [])
      .find((customer) => customer.email && !String(customer.id).startsWith('sent-'))?.email || '';
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
  // The list is fetched after the page paints, so the row buttons arrive a
  // moment later — waiting for one keeps this from racing the request.
  const openProfile = this.page.locator('.os-page').getByRole('button', { name: /view profile|view|open/i }).first();
  await expect(openProfile).toBeVisible({ timeout: 30000 });
  await openProfile.click();
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

When('the Store Manager creates a customer from the Customers tab', async function () {
  const owner = await this.api('Owner');
  // A previously interrupted local run must not leave its disposable record
  // in later reports or make the phone uniqueness check fail.
  const existingResponse = await owner.get(`${API_URL}/oms/customers`);
  const existingCustomers = (await existingResponse.json())?.data?.customers || [];
  for (const customer of existingCustomers.filter((entry) => entry.fullName?.startsWith('Store Assignment Customer '))) {
    if (!String(customer.id).startsWith('sent-')) await owner.delete(`${API_URL}/oms/customers/${customer.id}`);
  }
  const storesResponse = await owner.get(`${API_URL}/oms/stores`);
  const stores = (await storesResponse.json())?.data?.stores || [];
  const store = stores.find((entry) => entry.status === 'active');
  expect(store, 'there is no active store for the temporary Store Manager').toBeTruthy();
  this.expectedCustomerStore = String(store.name).replace(/\s+Store$/i, '');

  const tag = Date.now().toString().slice(-7);
  this.storeManagerPhone = `0841${tag}`;
  const staffResponse = await owner.post(`${API_URL}/oms/staff`, {
    data: {
      fullName: `Store Assignment Manager ${tag}`,
      displayName: `Store Assignment Manager ${tag}`,
      phone: this.storeManagerPhone,
      pin: 'probe26',
      role: 'store_manager',
      store: store.key,
    },
  });
  const staffBody = await staffResponse.json();
  expect(staffResponse.status(), staffBody?.message).toBe(201);
  this.storeManagerId = staffBody?.data?.staffUser?.id;

  const anonymous = await request.newContext();
  const login = await anonymous.post(`${API_URL}/oms/auth/login`, {
    data: { phone: this.storeManagerPhone, pin: 'probe26' },
  });
  const token = (await login.json())?.data?.token;
  await anonymous.dispose();
  expect(token, 'the temporary Store Manager could not sign in').toBeTruthy();
  const manager = await request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
  const response = await manager.post(`${API_URL}/oms/customers`, {
    data: {
      fullName: `Store Assignment Customer ${tag}`,
      phone: `0831${tag}`,
      category: 'New',
    },
  });
  const body = await response.json();
  await manager.dispose();
  await owner.dispose();
  expect(response.status(), body?.message).toBe(201);
  this.storeCustomerId = body?.data?.customer?.id;
  expect(body?.data?.customer?.stores).toContain(this.expectedCustomerStore);
});

Then("the new customer should show the Store Manager's assigned store", async function () {
  const owner = await this.api('Owner');
  try {
    const response = await owner.get(`${API_URL}/oms/customers?refreshedAt=${Date.now()}`);
    const body = await response.json();
    const customer = body?.data?.customers?.find((entry) => entry.id === this.storeCustomerId);
    expect(customer?.stores).toContain(this.expectedCustomerStore);
  } finally {
    if (this.storeCustomerId) await owner.delete(`${API_URL}/oms/customers/${this.storeCustomerId}`);
    if (this.storeManagerId) await owner.delete(`${API_URL}/oms/staff/${this.storeManagerId}`);
    await owner.dispose();
  }
});

Given('an invoice-only customer with no email address', async function () {
  // Keep interrupted local runs from leaving disposable invoices or active
  // customer profiles in later reports.
  const owner = await this.api('Owner');
  const [oldInvoicesResponse, oldCustomersResponse] = await Promise.all([
    owner.get(`${API_URL}/oms/invoices/sent`),
    owner.get(`${API_URL}/oms/customers`),
  ]);
  const oldInvoices = (await oldInvoicesResponse.json())?.data?.invoices || [];
  const oldCustomers = (await oldCustomersResponse.json())?.data?.customers || [];
  for (const invoice of oldInvoices.filter((entry) => entry.customer?.startsWith('Invoice Measurement Customer '))) {
    await owner.delete(`${API_URL}/oms/invoices/${invoice.invoiceNumber}`);
  }
  for (const customer of oldCustomers.filter((entry) => entry.fullName?.startsWith('Invoice Measurement Customer ') && !String(entry.id).startsWith('sent-'))) {
    await owner.delete(`${API_URL}/oms/customers/${customer.id}`);
  }
  await owner.dispose();

  const tag = Date.now().toString().slice(-7);
  this.invoiceOnlyCustomerName = `Invoice Measurement Customer ${tag}`;
  this.invoiceOnlyCustomerPhone = `0851${tag}`;
  this.invoiceOnlyNumber = `INVMEASURE${tag}`;
  const manager = await this.api('Store Manager');
  const response = await manager.post(`${API_URL}/oms/invoices/send-email`, {
    data: {
      skipEmail: true,
      store: 'lekki',
      invoiceNumber: this.invoiceOnlyNumber,
      paymentStatus: 'unpaid',
      customer: { name: this.invoiceOnlyCustomerName, phone: this.invoiceOnlyCustomerPhone },
      items: [{ description: 'Measurement test garment', quantity: 1, rate: 10000, amount: 10000 }],
      subtotal: 10000,
      balanceDue: 10000,
    },
  });
  const body = await response.json();
  expect(response.status(), body?.message).toBe(201);

  const listResponse = await manager.get(`${API_URL}/oms/customers?refreshedAt=${Date.now()}`);
  const listBody = await listResponse.json();
  await manager.dispose();
  const generated = listBody?.data?.customers?.find((customer) => customer.fullName === this.invoiceOnlyCustomerName);
  expect(generated, 'the saved invoice did not generate a customer-list entry').toBeTruthy();
  expect(String(generated.id)).toMatch(/^sent-/);
  await this.page.goto(this.rolePath('Customers'));
  const search = this.page.getByPlaceholder(/search customers/i);
  await expect(search).toBeVisible({ timeout: 20000 });
  await search.fill(this.invoiceOnlyCustomerName);
  const row = this.page.locator('tbody tr').filter({ hasText: this.invoiceOnlyCustomerName }).first();
  await expect(row, 'the invoice-only customer did not appear in Customers').toBeVisible({ timeout: 20000 });
  await row.getByRole('button', { name: /view profile/i }).click();
});

When('I add measurements to that generated customer profile', async function () {
  await this.page.getByRole('button', { name: /^edit$/i }).first().click();
  await this.page.getByRole('button', { name: /add measurements/i }).click();
  await this.page.getByRole('button', { name: /add measurements/i }).click();
  await this.page.getByLabel('Chest').fill('42');
  await this.page.getByLabel('Waist').fill('36');
  await this.page.getByRole('button', { name: /save measurements/i }).click();
  await expect(this.page.getByRole('button', { name: /edit measurements/i })).toBeVisible({ timeout: 15000 });
});

Then("the generated customer's measurements should remain saved", async function () {
  const owner = await this.api('Owner');
  try {
    const response = await owner.get(`${API_URL}/oms/customers?refreshedAt=${Date.now()}`);
    const body = await response.json();
    const customer = body?.data?.customers?.find((entry) => entry.fullName === this.invoiceOnlyCustomerName);
    expect(customer, 'the generated customer was not converted to a real profile').toBeTruthy();
    expect(String(customer.id)).not.toMatch(/^sent-/);
    expect(customer.measurements?.top_chest).toBe('42');
    expect(customer.measurements?.bottom_waist).toBe('36');
    this.invoiceMeasurementCustomerId = customer.id;
  } finally {
    if (this.invoiceMeasurementCustomerId) await owner.delete(`${API_URL}/oms/customers/${this.invoiceMeasurementCustomerId}`);
    if (this.invoiceOnlyNumber) await owner.delete(`${API_URL}/oms/invoices/${this.invoiceOnlyNumber}`);
    await owner.dispose();
  }
});

// Only an Owner or Admin can give the tag, and it drives an automatic discount,
// so it has to be visible wherever the customer is.
When('the Owner tags the first customer an elite member', async function () {
  const client = await this.api('Owner');
  const list = await client.get(`${API_URL}/oms/customers`);
  const customer = ((await list.json())?.data?.customers || [])
    .find((entry) => !String(entry.id).startsWith('sent-'));
  expect(customer, 'there is no customer with a profile to tag').toBeTruthy();

  this.eliteCustomer = customer;
  const response = await client.patch(`${API_URL}/oms/customers/${customer.id}`, {
    data: {
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      customerType: 'Elite Member',
    },
  });
  await client.dispose();
  expect(response.status(), 'the Owner could not tag an elite member').toBe(200);

  await this.page.reload();
  await this.page.waitForLoadState('networkidle');

  // The list is paginated and sorted newest first, so the customer is searched
  // for rather than assumed to be on the first page.
  const search = this.page.getByPlaceholder(/search/i).first();
  await search.fill(customer.fullName);
  await this.page.waitForTimeout(800);
});

Then('the customer list should show them as an elite member', async function () {
  const row = this.page.locator('tbody tr').filter({ hasText: this.eliteCustomer.fullName }).first();
  await expect(row, 'the tag saved but the list gives no sign of it').toContainText(/elite/i);
});

Then('their profile should show them as an elite member', async function () {
  const row = this.page.locator('tbody tr').filter({ hasText: this.eliteCustomer.fullName }).first();
  await row.getByRole('button', { name: /view profile/i }).click();
  await expect(this.page.locator('.os-page'), 'the profile gives no sign of the tag').toContainText(/elite/i);
});
