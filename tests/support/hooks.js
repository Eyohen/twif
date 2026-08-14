import { Before, BeforeAll, After, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request } from '@playwright/test';
import { APP_URL, API_URL } from './world.js';

setDefaultTimeout(60 * 1000);

// HEADED=1 to watch a run.
const headless = process.env.HEADED !== '1';

// A suite that fails because nothing is running looks like a suite that found
// real faults, so both ends are checked once before anything else.
BeforeAll({ timeout: 30 * 1000 }, async function () {
  const api = await request.newContext();
  const unreachable = [];

  try {
    const app = await api.get(APP_URL, { timeout: 5000 });
    if (!app.ok()) unreachable.push(`the app at ${APP_URL} answered ${app.status()}`);
  } catch {
    unreachable.push(`the app at ${APP_URL} is not answering — start it with "npm run dev"`);
  }

  try {
    // Signing in proves the API is up *and* that the seeded staff exist, which
    // is what every other scenario depends on.
    const login = await api.post(`${API_URL}/oms/auth/login`, {
      data: { phone: '08000000001', pin: 'owner26' },
      timeout: 5000,
    });
    if (!login.ok()) {
      unreachable.push(`the API at ${API_URL} refused the seeded Owner sign-in (${login.status()})`);
    }
  } catch {
    unreachable.push(`the API at ${API_URL} is not answering — start the server with "node index.js"`);
  }

  await api.dispose();
  if (unreachable.length) throw new Error(`Cannot run the suite:\n  - ${unreachable.join('\n  - ')}`);
});

Before(async function () {
  this.browser = await chromium.launch({ headless });
  this.context = await this.browser.newContext({ viewport: { width: 1440, height: 900 } });
  this.page = await this.context.newPage();
});

After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, 'image/png');
  }
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});

// Nothing in this suite may change a live system. Every scenario writes —
// invoices, customers, order sheets — and the hook below turns off an Admin's
// two-factor sign-in, which against production would leave a real account
// unprotected. Runs are refused unless the API is a local one.
const LOCAL_API = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/;

BeforeAll(function () {
  if (!LOCAL_API.test(API_URL)) {
    throw new Error(
      `Refusing to run against ${API_URL}. This suite creates orders and can turn off an Admin's `
      + 'two-factor sign-in, so it only runs against a local API. Set TWIF_API_URL to localhost.'
    );
  }
});

// The Admin signs in with a second factor. A scenario that enrols it and then
// fails would leave the seeded account needing a code that no later scenario
// has, so it is always cleared before the suite starts.
BeforeAll({ timeout: 30 * 1000 }, async function () {
  const api = await request.newContext();
  try {
    const login = await api.post(`${API_URL}/oms/auth/login`, {
      data: { phone: '08000000001', pin: 'owner26' },
    });
    const token = (await login.json())?.data?.token;
    if (!token) return;
    const owner = await request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    const staff = await owner.get(`${API_URL}/oms/staff`);
    const admin = ((await staff.json())?.data?.staffUsers || []).find((person) => person.role === 'admin');
    if (admin) await owner.post(`${API_URL}/oms/auth/2fa/disable`, { data: { staffId: admin.id } });
    await owner.dispose();
  } catch {
    // The reachability check above reports a server that is not answering.
  }
  await api.dispose();
});
