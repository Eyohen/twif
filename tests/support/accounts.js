// The seeded staff and the route behind each menu label, kept apart from the
// cucumber world so a plain script can read them too. Importing the world pulls
// in cucumber, which throws outside a cucumber run.

// The seeded staff logins. Scenarios name a role in plain English — "signed in
// as the Owner" — and the credentials are looked up here.
export const ACCOUNTS = {
  Owner: { role: 'owner', phone: '08000000001', pin: 'owner26', home: '/owner/overview', name: 'Jenni' },
  Administrator: { role: 'admin', phone: '08000000002', pin: 'admin26', home: '/admin/overview', name: 'Jim' },
  'Store Manager': { role: 'store_manager', phone: '08000000003', pin: 'store26', home: '/store-manager/overview', name: 'Bola' },
  Accountant: { role: 'accounts', phone: '08000000004', pin: 'accounts26', home: '/accounts/overview', name: 'Funke' },
  'Production Manager': { role: 'production_manager', phone: '08000000005', pin: 'production26', home: '/production-manager/overview', name: 'Tunde' },
  'Inventory Manager': { role: 'inventory_manager', phone: '08000000006', pin: 'inventory26', home: '/inventory-manager/overview', name: 'Kemi' },
  Tailor: { role: 'tailor', phone: '08000000007', pin: 'tailor26', home: '/tailor/my-tasks', name: 'Segun' },
};

// Navigation labels as they read in the sidebar, mapped to their route. The app
// derives a route from the label, so this follows the same rule — anything
// missing here is a view the suite cannot reach, which the render smoke test
// reports rather than skipping over.
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
  'My Log': 'my-log',
  'Tailor List': 'tailor-list',
  'Tailor Performance': 'tailor-performance',
  'Order Sheet': 'order-sheet',
  'User Management': 'user-management',
  Stores: 'stores',
  Memberships: 'memberships',
  Staff: 'staff',
  'Shopify Sync': 'shopify-sync',
};
