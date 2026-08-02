export const roles = [
  { id: 'owner', label: 'Owner', name: 'Jenni (Owner)' },
  { id: 'admin', label: 'Admin', name: 'Jim (Admin)' },
  { id: 'store_manager', label: 'Store Manager', name: 'Bola (Store Manager)' },
  { id: 'accounts', label: 'Accounts', name: 'Funke (Accounts)' },
  { id: 'production_manager', label: 'Production Mgr', name: 'Tunde (Production)' },
  { id: 'inventory_manager', label: 'Inventory Mgr', name: 'Kemi (Inventory)' },
  { id: 'tailor', label: 'Tailor', name: 'Segun (Tailor)' },
];

export const demoCredentials = [
  { phone: '08000000001', pin: 'owner26', role: 'owner', label: 'Owner' },
  { phone: '08000000002', pin: 'admin26', role: 'admin', label: 'Admin' },
  { phone: '08000000003', pin: 'store26', role: 'store_manager', label: 'Store Manager' },
  { phone: '08000000004', pin: 'accounts26', role: 'accounts', label: 'Accounts' },
  { phone: '08000000005', pin: 'production26', role: 'production_manager', label: 'Production Manager' },
  { phone: '08000000006', pin: 'inventory26', role: 'inventory_manager', label: 'Inventory Manager' },
  { phone: '08000000007', pin: 'tailor26', role: 'tailor', label: 'Tailor' },
];

export const inventoryCategories = [
  'Suiting', 'Shirting', 'Jacket', 'Trouser', 'Native', 'Bridal',
  'Lining', 'Trim', 'Accessories', 'Cloth', 'Add Ons',
];

export const navByRole = {
  owner: ['Overview', 'Orders', 'Customers', 'Invoices', 'Payments', 'Production', 'Inventory', 'User Management', 'Stores', 'Memberships', 'Reports', 'Settings'],
  admin: ['Overview', 'Orders', 'Customers', 'Payments', 'Production', 'Inventory', 'Staff', 'Reports', 'Notifications'],
  store_manager: ['Overview', 'Invoices', 'Orders', 'Customers', 'Order Sheet', 'Notifications'],
  accounts: ['Overview', 'Invoices', 'Payments', 'Reports', 'Inventory', 'Notifications'],
  production_manager: ['Overview', 'Production', 'Inventory', 'Notifications'],
  inventory_manager: ['Overview', 'Inventory', 'Notifications'],
  tailor: ['Overview', 'My Tasks', 'Weekly Log', 'Notifications'],
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
