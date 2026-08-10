export const roles = [
  { id: 'owner', label: 'Owner', name: 'Jenni (Owner)' },
  { id: 'admin', label: 'Admin', name: 'Jim (Admin)' },
  { id: 'store_manager', label: 'Store Manager', name: 'Bola (Store Manager)' },
  { id: 'accounts', label: 'Accounts', name: 'Funke (Accounts)' },
  { id: 'production_manager', label: 'Production Mgr', name: 'Tunde (Production)' },
  { id: 'inventory_manager', label: 'Inventory Mgr', name: 'Kemi (Inventory)' },
  { id: 'tailor', label: 'Tailor', name: 'Segun (Tailor)' },
];

// The staff list with their PINs used to live here, which meant it was compiled
// into the JavaScript and readable by anyone who opened the bundle. Sign-in is
// checked on the server now, against a hashed PIN, so nothing about an account
// belongs in the client.

export const inventoryCategories = [
  'Suiting', 'Shirting', 'Jacket', 'Trouser', 'Native', 'Bridal',
  'Lining', 'Trim', 'Accessories', 'Cloth', 'Add Ons',
];

export const navByRole = {
  // Notifications was missing here, and the route guard only allows a view
  // that appears in the role's navigation — so the Owner's bell navigated to
  // /owner/notifications and was redirected straight back to the overview.
  owner: ['Overview', 'Orders', 'Customers', 'Invoices', 'Payments', 'Production', 'Inventory', 'User Management', 'Stores', 'Memberships', 'Reports', 'Settings', 'Notifications'],
  admin: ['Overview', 'Orders', 'Customers', 'Payments', 'Production', 'Inventory', 'Staff', 'Memberships', 'Reports', 'Settings', 'Notifications'],
  store_manager: ['Overview', 'Customers', 'Orders', 'Invoices', 'Order Sheet', 'Notifications'],
  accounts: ['Overview', 'Invoices', 'Payments', 'Reports', 'Inventory', 'Notifications'],
  production_manager: ['Overview', 'Production', 'Inventory', 'Notifications'],
  inventory_manager: ['Overview', 'Inventory', 'Notifications'],
  tailor: ['My Tasks', 'Weekly Log', 'Notifications'],
};

export const accountTypeByRole = {
  owner: { label: 'Owner Account', short: 'Owner', icon: 'OW' },
  admin: { label: 'Administrator Account', short: 'Administrator', icon: 'AD' },
  store_manager: { label: 'Store Manager Account', short: 'Store Manager', icon: 'SM' },
  accounts: { label: 'Accountant Account', short: 'Accountant', icon: 'AC' },
  production_manager: { label: 'Production Account', short: 'Production', icon: 'PR' },
  inventory_manager: { label: 'Inventory Manager Account', short: 'Inventory Manager', icon: 'IM' },
  tailor: { label: 'Tailor Account', short: 'Tailor', icon: 'TA' },
};

export const navIcons = {
  Overview: 'LayoutDashboard',
  Orders: 'Package',
  Customers: 'Users',
  Invoices: 'FileText',
  Payments: 'CreditCard',
  Production: 'Factory',
  Inventory: 'Boxes',
  Notifications: 'Bell',
  Reports: 'BarChart2',
  Settings: 'Settings',
  'Order Sheet': 'ClipboardList',
  'My Tasks': 'CheckSquare',
  'Weekly Log': 'Calendar',
  Staff: 'Users2',
  'Tailors & Staff': 'Users2',
  'User Management': 'UserCog',
  Stores: 'Building2',
  Memberships: 'Star',
};
