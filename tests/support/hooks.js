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
    const server = await api.get(`${API_URL}/oms/invoices/sent`, { timeout: 5000 });
    if (!server.ok()) unreachable.push(`the API at ${API_URL} answered ${server.status()}`);
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
