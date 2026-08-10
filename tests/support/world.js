import { setWorldConstructor, World } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

export const APP_URL = process.env.TWIF_APP_URL || 'http://localhost:5173';
export const API_URL = process.env.TWIF_API_URL || 'http://localhost:8084/api';

// The seeded staff logins. Scenarios name a role in plain English — "signed in
// as the Owner" — and the credentials are looked up here.
export const ACCOUNTS = {
  Owner: { phone: '08000000001', pin: 'owner26', home: '/owner/overview', name: 'Jenni' },
  Administrator: { phone: '08000000002', pin: 'admin26', home: '/admin/overview', name: 'Jim' },
  'Store Manager': { phone: '08000000003', pin: 'store26', home: '/store-manager/overview', name: 'Bola' },
  Accountant: { phone: '08000000004', pin: 'accounts26', home: '/accounts/overview', name: 'Funke' },
  'Production Manager': { phone: '08000000005', pin: 'production26', home: '/production-manager/overview', name: 'Tunde' },
  'Inventory Manager': { phone: '08000000006', pin: 'inventory26', home: '/inventory-manager/overview', name: 'Kemi' },
  Tailor: { phone: '08000000007', pin: 'tailor26', home: '/tailor/my-tasks', name: 'Segun' },
};

// Navigation labels as they read in the sidebar, mapped to their route.
export const VIEW_PATHS = {
  Overview: 'overview',
  Orders: 'orders',
  Customers: 'customers',
  Invoices: 'invoices',
  Payments: 'payments',
  Production: 'production',
  Inventory: 'inventory',
  Reports: 'reports',
  Settings: 'settings',
  Notifications: 'notifications',
  'My Tasks': 'my-tasks',
  'Weekly Log': 'weekly-log',
  'Order Sheet': 'order-sheet',
};

class TwifWorld extends World {
  constructor(options) {
    super(options);
    this.role = null;
  }

  // Signing in is the first line of nearly every scenario, so it lives on the
  // World rather than being repeated in each step file.
  async signIn(roleName) {
    const account = ACCOUNTS[roleName];
    if (!account) throw new Error(`No seeded account for the role "${roleName}"`);

    await this.page.goto(`${APP_URL}/login`);
    // A previous scenario's session would otherwise skip the form entirely.
    await this.page.evaluate(() => window.localStorage.clear());
    await this.page.reload();

    await this.page.getByPlaceholder('08160000000').fill(account.phone);
    await this.page.getByPlaceholder('Enter PIN').fill(account.pin);
    await this.page.getByRole('button', { name: /continue/i }).click();
    await this.page.waitForURL(new RegExp(`${account.home}$`), { timeout: 20000 });

    this.role = roleName;
    this.account = account;
    return account;
  }

  rolePath(view) {
    const slug = VIEW_PATHS[view];
    if (!slug) throw new Error(`No route known for the view "${view}"`);
    const base = this.account.home.split('/')[1];
    return `${APP_URL}/${base}/${slug}`;
  }

  // Several scenarios assert that a screen does not run off the side, which is
  // how most of the layout faults showed themselves.
  async horizontalOverflow() {
    return this.page.evaluate(() => {
      const doc = document.documentElement;
      const workspace = document.querySelector('.workspace');
      return Math.max(
        doc.scrollWidth - doc.clientWidth,
        workspace ? workspace.scrollWidth - workspace.clientWidth : 0,
      );
    });
  }

  async bodyText() {
    return this.page.evaluate(() => document.body.innerText);
  }
}

setWorldConstructor(TwifWorld);

export { expect };
