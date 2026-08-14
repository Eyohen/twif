// Opens every page in every role against the deployed site and reports which
// ones rendered. Read-only: it signs in and navigates, and writes nothing.
//
// The cucumber suite deliberately refuses to run against anything but a local
// API, because it creates orders and can turn an Admin's two-factor off. This
// is the safe counterpart for checking what is actually live.
//
//   node tests/check-live.mjs [appUrl] [apiUrl]
import { chromium } from '@playwright/test';
import { navByRole } from '../src/config/oms.js';
import { VIEW_PATHS, ACCOUNTS } from './support/accounts.js';

const APP = process.argv[2] || 'https://twif-iota.vercel.app';
const API = process.argv[3] || 'https://twifserver-production.up.railway.app/api';

const browser = await chromium.launch();
let failures = 0;

for (const [roleName, account] of Object.entries(ACCOUNTS)) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Anything React throws during render shows here and nowhere else.
  const thrown = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/is not defined|The above error occurred|Minified React error/.test(text)) {
      thrown.push(text.split('\n')[0].slice(0, 120));
    }
  });

  const login = await fetch(`${API}/oms/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: account.phone, pin: account.pin }),
  }).then((response) => response.json()).catch(() => null);

  // An Admin needs a second factor, so there is no session to seed for them.
  if (!login?.data?.token) {
    console.log(`\n${roleName}: skipped (${login?.data?.twoFactorRequired ? 'needs a second factor' : login?.message || 'could not sign in'})`);
    await context.close();
    continue;
  }

  await page.goto(`${APP}/login`);
  await page.evaluate(([token, staff, label]) => {
    localStorage.setItem('twif_oms_session', JSON.stringify({
      role: staff.role, phone: staff.phone, label, name: staff.displayName,
    }));
    localStorage.setItem('twif_oms_last_active', String(Date.now()));
    localStorage.setItem('twif_access_token', token);
  }, [login.data.token, login.data.staff, roleName]);

  console.log(`\n${roleName}`);
  const base = account.home.split('/')[1];

  for (const view of navByRole[account.role] || []) {
    const slug = VIEW_PATHS[view];
    if (!slug) {
      console.log(`  ?  ${view} — no route known`);
      continue;
    }
    await page.goto(`${APP}/${base}/${slug}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(600);
    const painted = await page.evaluate(() => (document.querySelector('main') || document.body).innerText.trim().length);
    const blank = painted < 40;
    if (blank) failures += 1;
    console.log(`  ${blank ? '✗' : '✓'}  ${view}${blank ? '  — RENDERED NOTHING' : ''}`);
  }

  if (thrown.length) {
    failures += thrown.length;
    console.log(`  React threw: ${[...new Set(thrown)].join(' | ')}`);
  }
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} problem(s) on the live site.` : '\nEvery page rendered on the live site.');
process.exit(failures ? 1 : 0);
