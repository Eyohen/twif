import { useEffect, useMemo, useState } from 'react';
import { api } from './lib/api';

const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const roles = [
  { id: 'owner', label: 'Owner', name: 'Jenni (Owner)' },
  { id: 'admin', label: 'Admin', name: 'Jim (Admin)' },
  { id: 'store_manager', label: 'Store Manager', name: 'Bola (Store Manager)' },
  { id: 'accounts', label: 'Accounts', name: 'Funke (Accounts)' },
  { id: 'production_manager', label: 'Production Mgr', name: 'Tunde (Production)' },
  { id: 'inventory_manager', label: 'Inventory Mgr', name: 'Kemi (Inventory)' },
  { id: 'tailor', label: 'Tailor', name: 'Segun (Tailor)' },
];

const demoCredentials = [
  { phone: '08000000001', pin: 'owner26', role: 'owner', label: 'Owner' },
  { phone: '08000000002', pin: 'admin26', role: 'admin', label: 'Admin' },
  { phone: '08000000003', pin: 'store26', role: 'store_manager', label: 'Store Manager' },
  { phone: '08000000004', pin: 'accounts26', role: 'accounts', label: 'Accounts' },
  { phone: '08000000005', pin: 'production26', role: 'production_manager', label: 'Production Manager' },
  { phone: '08000000006', pin: 'inventory26', role: 'inventory_manager', label: 'Inventory Manager' },
  { phone: '08000000007', pin: 'tailor26', role: 'tailor', label: 'Tailor' },
];

const stores = ['All Stores', 'Ikeja', 'Lekki'];

const todayIso = () => new Date().toISOString().slice(0, 10);

const invoiceSeed = () => `INV${Math.floor(Math.random() * 90000) + 10000}`;

const invoiceItemSeed = () => `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const trackingTokenSeed = () => Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8);

const trackingBaseUrl = (import.meta.env.VITE_TRACKING_BASE_URL || 'https://track.twiflagos.com').replace(/\/+$/, '');

const trackingUrlForToken = (token) => `${trackingBaseUrl}/c/${token}`;

const toNumber = (value) => Number(value) || 0;

const dateInputValue = (value, fallback = todayIso()) => {
  if (!value) return fallback;
  return String(value).slice(0, 10);
};

const SENT_INVOICES_KEY = 'twif.sentInvoices';
const PRODUCTION_JOBS_KEY = 'twif.productionJobs';

const paymentStatusLabels = {
  partial_paid: 'Partial Paid',
  fully_paid: 'Fully Paid',
};

const loadSentInvoices = () => {
  try {
    return JSON.parse(localStorage.getItem(SENT_INVOICES_KEY) || '[]');
  } catch (error) {
    return [];
  }
};

const loadStoredProductionJobs = () => {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTION_JOBS_KEY) || '[]');
  } catch (error) {
    return [];
  }
};

const orders = [
  {
    id: 'TWIF-2026-0041',
    customer: 'Ken Mbachu',
    phone: '0803 221 8844',
    store: 'Lekki',
    item: 'Three-piece suit',
    pieces: 3,
    delivery: '12 Jul 2026',
    amount: 780000,
    paid: 400000,
    status: 'Work in Progress',
    payment: 'Partial Paid',
    fabric: 'Black jacquard wool',
    tailor: 'Segun',
    images: 4,
    note: 'Collared neckline, structured shoulder, Image 2 lapel reference.',
  },
  {
    id: 'TWIF-2026-0042',
    customer: 'Frank Ade-Williams',
    phone: '0816 440 9077',
    store: 'Ikeja',
    item: 'Native kaftan set',
    pieces: 2,
    delivery: '09 Jul 2026',
    amount: 320000,
    paid: 320000,
    status: 'Pending Confirmation',
    payment: 'Fully Paid',
    fabric: 'Client supplied',
    tailor: 'Unassigned',
    images: 3,
    note: 'Clean neckline, minimal embroidery, trouser slim but not tight.',
  },
  {
    id: 'TWIF-2026-0043',
    customer: 'Audu Mustapha',
    phone: '0705 183 2261',
    store: 'Lekki',
    item: 'Dinner jacket',
    pieces: 1,
    delivery: '15 Jul 2026',
    amount: 520000,
    paid: 520000,
    status: 'Ready',
    payment: 'Fully Paid',
    fabric: 'Midnight velvet',
    tailor: 'Musa',
    images: 5,
    note: 'Peak lapel, covered buttons, no pocket flap.',
  },
];

const payments = [
  { id: 'PAY-1841', order: 'TWIF-2026-0042', customer: 'Frank Ade-Williams', store: 'Ikeja', amount: 320000, mode: 'Transfer', bank: 'GTBank', status: 'Needs Review' },
  { id: 'PAY-1838', order: 'TWIF-2026-0041', customer: 'Ken Mbachu', store: 'Lekki', amount: 400000, mode: 'POS', bank: 'Moniepoint', status: 'Confirmed' },
  { id: 'PAY-1837', order: 'TWIF-2026-0039', customer: 'Dare Johnson', store: 'Ikeja', amount: 150000, mode: 'Cash', bank: 'Till', status: 'Flagged' },
];

const fabrics = [
  { name: 'Black jacquard wool', type: 'Suiting', qty: 18, unit: 'm', threshold: 10, status: 'Healthy' },
  { name: 'Midnight velvet', type: 'Jacket', qty: 6, unit: 'm', threshold: 8, status: 'Low' },
  { name: 'White cotton poplin', type: 'Shirting', qty: 44, unit: 'm', threshold: 15, status: 'Healthy' },
  { name: 'Gold aso-oke trim', type: 'Trim', qty: 4, unit: 'rolls', threshold: 5, status: 'Low' },
];

const tailorOptions = [
  { name: 'Segun', department: 'Suit', grade: 4 },
  { name: 'Musa', department: 'Finishing', grade: 5 },
  { name: 'Hassan', department: 'Trouser', grade: 3 },
  { name: 'Ayo', department: 'Native', grade: 4 },
];

const initialProductionJobs = orders
  .filter((order) => ['Partial Paid', 'Fully Paid'].includes(order.payment))
  .map((order) => ({
    ...order,
    fabricConfirmed: order.fabric !== 'Client supplied',
    productionNote: order.note,
    assignedAt: 'Seeded',
  }));

const staff = [
  { name: 'Jenni', role: 'Owner', store: 'All', status: 'Active', lastLogin: 'Today, 21:18' },
  { name: 'Bola', role: 'Store Manager', store: 'Ikeja', status: 'Active', lastLogin: 'Today, 18:42' },
  { name: 'Funke', role: 'Accounts', store: 'All', status: 'Active', lastLogin: 'Today, 17:03' },
  { name: 'Segun', role: 'Tailor', store: 'Production', status: 'Active', lastLogin: 'Today, 08:12', department: 'Suit', grade: 4 },
];

const notifications = [
  { channel: 'Payments', text: 'Frank Ade-Williams payment is waiting for Accounts review.', time: '4 min ago' },
  { channel: 'Production', text: 'Audu Mustapha dinner jacket was marked Ready.', time: '18 min ago' },
  { channel: 'Inventory', text: 'Midnight velvet is below stock threshold.', time: '1 hr ago' },
  { channel: 'Security', text: 'One failed login attempt for Store Manager account.', time: '2 hrs ago' },
];

const navByRole = {
  owner: ['Overview', 'Orders', 'Customers', 'Payments', 'Production', 'Inventory', 'Staff', 'Reports', 'Notifications'],
  admin: ['Overview', 'Orders', 'Customers', 'Payments', 'Production', 'Inventory', 'Staff', 'Reports', 'Notifications'],
  store_manager: ['Overview', 'Orders', 'Customers', 'New Invoice', 'Order Sheet', 'Notifications'],
  accounts: ['Overview', 'Payments', 'Reports', 'Notifications'],
  production_manager: ['Overview', 'Production', 'Inventory', 'Notifications'],
  inventory_manager: ['Overview', 'Inventory', 'Notifications'],
  tailor: ['My Tasks', 'Weekly Log', 'Notifications'],
};

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function Stat({ label, value, detail, tone = 'dark' }) {
  return (
    <article className={classNames('stat', `stat-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Status({ children }) {
  const normalized = String(children).toLowerCase().replace(/\s+/g, '-');
  return <span className={classNames('status', `status-${normalized}`)}>{children}</span>;
}

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="section-header">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const account = demoCredentials.find((item) => (
      item.phone === phone.trim() && item.pin === pin.trim()
    ));

    if (!account) {
      setError('Invalid phone number or PIN');
      return;
    }

    setError('');
    onLogin(account);
  };

  return (
    <main className="login-page">
      <section className="login-app-frame">
        <div className="login-brand-top">
          <div className="app-mark">twif</div>
          <div>
            <span>THE WAY IT FITS</span>
            <strong>Operations</strong>
          </div>
        </div>

        <div className="login-welcome">
          <p>Staff Access</p>
          <h1>Manage the floor from anywhere.</h1>
        </div>

        <section className="login-panel">
          <div className="login-panel-head">
            <div>
              <span>Secure sign in</span>
              <h2>Welcome back</h2>
            </div>
            <div className="mark">TW</div>
          </div>

          <form onSubmit={submit}>
            {error ? <div className="login-error">{error}</div> : null}
            <label>
              Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="08000000003" />
            </label>
            <label>
              PIN
              <span className="pin-input-wrap">
                <input
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  type={showPin ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter PIN"
                />
                <button
                  type="button"
                  className="pin-toggle"
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  onClick={() => setShowPin((current) => !current)}
                >
                  {showPin ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.5 4.4A10.6 10.6 0 0 1 12 4c5 0 8.7 4.1 10 8a12.6 12.6 0 0 1-2.1 3.8" />
                      <path d="M6.1 6.1A12.2 12.2 0 0 0 2 12c1.3 3.9 5 8 10 8 1.5 0 2.9-.4 4.1-1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
            <button className="login-submit" type="submit">Continue</button>
          </form>

          <p>Access is matched to your assigned role automatically.</p>
        </section>

        <div className="login-bottom-safe">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}

function Overview({ role, productionJobs = [], onUpdateJob }) {
  const isTailor = role === 'tailor';

  if (isTailor) {
    return <TailorTasks compact productionJobs={productionJobs} onUpdateJob={onUpdateJob} />;
  }

  return (
    <div className="stack">
      <section className="metrics-grid">
        <Stat label="Active orders" value="18" detail="11 Lekki, 7 Ikeja" />
        <Stat label="Payment review" value="6" detail="Awaiting Accounts" tone="gold" />
        <Stat label="Ready today" value="4" detail="Store handoff pending" />
        <Stat label="Low stock" value="2" detail="Velvet, aso-oke trim" tone="alert" />
      </section>

      <section className="work-grid">
        <div className="panel span-2">
          <SectionHeader eyebrow="Orders" title="Live Order Queue">
            <select>
              {stores.map((store) => <option key={store}>{store}</option>)}
            </select>
          </SectionHeader>
          <OrderTable rows={orders} />
        </div>
        <NotificationPanel />
      </section>
    </div>
  );
}

function OrderTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Store</th>
            <th>Item</th>
            <th>Delivery</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.id}>
              <td data-label="Invoice"><strong>{order.id}</strong></td>
              <td data-label="Customer">{order.customer}</td>
              <td data-label="Store">{order.store}</td>
              <td data-label="Item">{order.item}</td>
              <td data-label="Delivery">{order.delivery}</td>
              <td data-label="Payment"><Status>{order.payment}</Status></td>
              <td data-label="Status"><Status>{order.status}</Status></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersView({ sentInvoices }) {
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const invoicePageSize = 8;

  const filteredInvoices = useMemo(() => {
    const query = invoiceSearch.trim().toLowerCase();
    if (!query) return sentInvoices;

    return sentInvoices.filter((invoice) => [
      invoice.invoiceNumber,
      invoice.customer,
      invoice.store,
      invoice.createdBy,
      invoice.paymentStatus,
      invoice.emailStatus,
      invoice.orderStatus,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [invoiceSearch, sentInvoices]);

  const invoicePageCount = Math.max(1, Math.ceil(filteredInvoices.length / invoicePageSize));
  const currentInvoicePage = Math.min(invoicePage, invoicePageCount);
  const visibleInvoices = filteredInvoices.slice(
    (currentInvoicePage - 1) * invoicePageSize,
    currentInvoicePage * invoicePageSize,
  );
  const invoiceStart = filteredInvoices.length ? ((currentInvoicePage - 1) * invoicePageSize) + 1 : 0;
  const invoiceEnd = Math.min(currentInvoicePage * invoicePageSize, filteredInvoices.length);

  const updateInvoiceSearch = (value) => {
    setInvoiceSearch(value);
    setInvoicePage(1);
  };

  return (
    <div className="stack">
      <SectionHeader eyebrow="Orders" title="Invoice and Order Sheet Control">
        <button className="primary-action">New Invoice</button>
      </SectionHeader>
      <div className="order-cards">
        {orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div>
              <span>{order.id}</span>
              <Status>{order.status}</Status>
            </div>
            <h3>{order.customer}</h3>
            <p>{order.item} · {order.pieces} pieces · {order.store}</p>
            <dl>
              <div><dt>Total</dt><dd>{money.format(order.amount)}</dd></div>
              <div><dt>Paid</dt><dd>{money.format(order.paid)}</dd></div>
              <div><dt>Delivery</dt><dd>{order.delivery}</dd></div>
              <div><dt>Style images</dt><dd>{order.images}/5</dd></div>
            </dl>
            <p className="note">{order.note}</p>
          </article>
        ))}
      </div>

      <section className="panel invoice-register-panel">
        <SectionHeader eyebrow="Invoices" title="Invoices Created by Store Manager">
          <input
            className="search"
            placeholder="Search invoice or customer"
            value={invoiceSearch}
            onChange={(event) => updateInvoiceSearch(event.target.value)}
          />
        </SectionHeader>

        {filteredInvoices.length ? (
          <>
            <div className="invoice-table-shell">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Store</th>
                    <th>Created By</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Email</th>
                    <th>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInvoices.map((invoice) => (
                    <tr key={invoice.invoiceNumber}>
                      <td data-label="Invoice"><strong>{invoice.invoiceNumber}</strong></td>
                      <td data-label="Customer">{invoice.customer}</td>
                      <td data-label="Store">{invoice.store}</td>
                      <td data-label="Created by">{invoice.createdBy}</td>
                      <td data-label="Date">{invoice.createdAt}</td>
                      <td data-label="Total"><strong>{money.format(invoice.total)}</strong></td>
                      <td data-label="Payment"><Status>{invoice.paymentStatus}</Status></td>
                      <td data-label="Email"><Status>{invoice.emailStatus}</Status></td>
                      <td data-label="Order"><Status>{invoice.orderStatus}</Status></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-pagination">
              <span>
                Showing {invoiceStart}-{invoiceEnd} of {filteredInvoices.length}
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => setInvoicePage(Math.max(1, currentInvoicePage - 1))}
                  disabled={currentInvoicePage === 1}
                >
                  Previous
                </button>
                <strong>{currentInvoicePage} / {invoicePageCount}</strong>
                <button
                  type="button"
                  onClick={() => setInvoicePage(Math.min(invoicePageCount, currentInvoicePage + 1))}
                  disabled={currentInvoicePage === invoicePageCount}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="invoice-register-list">
            <div className="invoice-preview-empty">
              {sentInvoices.length
                ? 'No invoices match your search.'
                : 'Sent invoices will appear here after the Store Manager sends an invoice email.'}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CustomersView() {
  const customers = [
    { name: 'Ken Mbachu', category: 'Elite', spend: 4200000, orders: 16, credit: 0 },
    { name: 'Frank Ade-Williams', category: 'Returning', spend: 1280000, orders: 7, credit: 45000 },
    { name: 'Audu Mustapha', category: 'Elite', spend: 6100000, orders: 21, credit: 0 },
  ];

  return (
    <section className="panel">
      <SectionHeader eyebrow="Clients" title="Customer Profiles">
        <input className="search" placeholder="Search name or phone" />
      </SectionHeader>
      <div className="customer-grid">
        {customers.map((customer) => (
          <article className="customer-card" key={customer.name}>
            <div className="avatar">{customer.name.split(' ').map((part) => part[0]).join('')}</div>
            <h3>{customer.name}</h3>
            <Status>{customer.category}</Status>
            <dl>
              <div><dt>12-month spend</dt><dd>{money.format(customer.spend)}</dd></div>
              <div><dt>Confirmed orders</dt><dd>{customer.orders}</dd></div>
              <div><dt>Store credit</dt><dd>{money.format(customer.credit)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewInvoiceView({ currentRole, onInvoiceSent }) {
  const [form, setForm] = useState({
    store: 'lekki',
    invoiceNumber: invoiceSeed(),
    trackingToken: trackingTokenSeed(),
    invoiceDate: todayIso(),
    dueDate: todayIso(),
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    paymentStatus: 'partial_paid',
    eliteDiscountEnabled: false,
    eliteDiscountAmount: 0,
    storeCreditApplied: 0,
    trackingUrl: '',
    notes: 'Your order will be ready in 3-4 weeks from date of payment and measurements.\nThis invoice is only valid for 48 hours.',
  });
  const [items, setItems] = useState([
    { id: invoiceItemSeed(), description: '', rate: 0, quantity: 1, discountPercent: 0, amount: 0, note: '' },
  ]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const subtotal = items.reduce((sum, item) => sum + (toNumber(item.rate) * toNumber(item.quantity)), 0);
  const itemDiscountTotal = items.reduce((sum, item) => {
    const gross = toNumber(item.rate) * toNumber(item.quantity);
    return sum + ((gross * toNumber(item.discountPercent)) / 100);
  }, 0);
  const eliteDiscountAmount = form.eliteDiscountEnabled ? toNumber(form.eliteDiscountAmount) : 0;
  const balanceDue = Math.max(subtotal - itemDiscountTotal - eliteDiscountAmount - toNumber(form.storeCreditApplied), 0);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      const gross = toNumber(next.rate) * toNumber(next.quantity);
      const discountAmount = (gross * toNumber(next.discountPercent)) / 100;
      return { ...next, amount: Math.max(gross - discountAmount, 0) };
    }));
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: invoiceItemSeed(), description: '', rate: 0, quantity: 1, discountPercent: 0, amount: 0, note: '' },
    ]);
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const invoicePayload = () => ({
    store: form.store,
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate,
    recipientEmail: form.customerEmail,
    createdByName: currentRole?.name || 'Store Manager',
    paymentStatus: form.paymentStatus,
    trackingToken: form.trackingToken,
    customer: {
      name: form.customerName,
      phone: form.customerPhone,
    },
    items: items
      .filter((item) => item.description.trim())
      .map((item) => ({
        description: item.description,
        note: item.note,
        rate: toNumber(item.rate),
        quantity: toNumber(item.quantity),
        discountPercent: toNumber(item.discountPercent),
        amount: toNumber(item.amount),
      })),
    subtotal,
    eliteDiscountAmount,
    storeCreditApplied: toNumber(form.storeCreditApplied),
    balanceDue,
    trackingUrl: form.trackingUrl || trackingUrlForToken(form.trackingToken),
    notes: form.notes.split('\n').map((note) => note.trim()).filter(Boolean),
  });

  const previewInvoice = async () => {
    setMessage('');
    try {
      const response = await api.post('/oms/invoices/html-preview', invoicePayload(), {
        responseType: 'text',
      });
      setPreviewHtml(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to preview invoice');
    }
  };

  const sendInvoice = async () => {
    setSending(true);
    setMessage('');

    try {
      const payload = invoicePayload();
      const response = await api.post('/oms/invoices/send-email', payload);
      const serverInvoice = response.data?.data?.sentInvoice;
      const firstItem = payload.items[0] || {};
      onInvoiceSent(serverInvoice || {
        invoiceNumber: payload.invoiceNumber,
        customer: payload.customer.name,
        store: payload.store === 'lekki' ? 'Lekki' : 'Ikeja',
        createdBy: currentRole?.name || 'Store Manager',
        createdAt: new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date()),
        total: payload.balanceDue,
        emailStatus: 'Sent',
        paymentStatus: paymentStatusLabels[payload.paymentStatus],
        orderStatus: paymentStatusLabels[payload.paymentStatus],
        item: firstItem.description || '',
        pieces: firstItem.quantity || 1,
        deliveryDate: payload.dueDate,
        itemNote: firstItem.note || payload.notes?.[0] || '',
        trackingToken: payload.trackingToken,
        trackingUrl: payload.trackingUrl,
      });
      setMessage(response.data.message || 'Invoice email sent');
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to send invoice email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="invoice-workspace">
      <section className="panel">
        <SectionHeader eyebrow="Customer Invoice" title="Create and Send Invoice" />

        <div className="invoice-form-grid">
          <label>Sending store
            <select value={form.store} onChange={(event) => updateForm('store', event.target.value)}>
              <option value="lekki">Lekki Store</option>
              <option value="ikeja">Ikeja Store</option>
            </select>
          </label>
          <label>Invoice number
            <input value={form.invoiceNumber} readOnly />
          </label>
          <label>Invoice date
            <input type="date" value={form.invoiceDate} onChange={(event) => updateForm('invoiceDate', event.target.value)} />
          </label>
          <label>Due date
            <input type="date" value={form.dueDate} onChange={(event) => updateForm('dueDate', event.target.value)} />
          </label>
          <label>Payment status
            <select value={form.paymentStatus} onChange={(event) => updateForm('paymentStatus', event.target.value)}>
              <option value="partial_paid">Partial Paid</option>
              <option value="fully_paid">Fully Paid</option>
            </select>
          </label>
          <label>Customer name
            <input value={form.customerName} onChange={(event) => updateForm('customerName', event.target.value)} />
          </label>
          <label>Customer phone
            <input value={form.customerPhone} onChange={(event) => updateForm('customerPhone', event.target.value)} />
          </label>
          <label className="wide-field">Customer email
            <input type="email" value={form.customerEmail} onChange={(event) => updateForm('customerEmail', event.target.value)} placeholder="customer@email.com" />
          </label>
        </div>

        <div className="invoice-items-header">
          <h3>Invoice Items</h3>
          <button onClick={addItem}>Add Item</button>
        </div>

        <div className="invoice-items">
          {items.map((item, index) => (
            <article className="invoice-item-row" key={item.id}>
              <label>Description
                <input value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
              </label>
              <label>Rate
                <input type="number" value={item.rate} onChange={(event) => updateItem(index, 'rate', event.target.value)} />
              </label>
              <label>Qty
                <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
              </label>
              <label>Discount %
                <input type="number" min="0" max="100" value={item.discountPercent} onChange={(event) => updateItem(index, 'discountPercent', event.target.value)} />
              </label>
              <label>Amount
                <input readOnly value={money.format(toNumber(item.amount))} />
              </label>
              <label className="wide-field">Item note
                <input value={item.note} onChange={(event) => updateItem(index, 'note', event.target.value)} placeholder="Optional" />
              </label>
              <button className="danger-action" onClick={() => removeItem(index)} disabled={items.length === 1}>Remove</button>
            </article>
          ))}
        </div>

        <div className="invoice-form-grid invoice-adjustments">
          <label className="checkbox-field">
            <input type="checkbox" checked={form.eliteDiscountEnabled} onChange={(event) => updateForm('eliteDiscountEnabled', event.target.checked)} />
            Apply 5% Elite discount
          </label>
          <label>Elite discount amount
            <input type="number" value={form.eliteDiscountAmount} onChange={(event) => updateForm('eliteDiscountAmount', event.target.value)} disabled={!form.eliteDiscountEnabled} />
          </label>
          <label>Store credit applied
            <input type="number" value={form.storeCreditApplied} onChange={(event) => updateForm('storeCreditApplied', event.target.value)} />
          </label>
          <label className="wide-field">Tracking link
            <input value={form.trackingUrl} onChange={(event) => updateForm('trackingUrl', event.target.value)} />
          </label>
          <label className="wide-field">Other notes
            <textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} />
          </label>
        </div>
      </section>

      <aside className="panel invoice-summary-panel">
        <SectionHeader eyebrow="Email Preview" title="Invoice Summary" />
        <dl className="invoice-summary">
          <div><dt>Store</dt><dd>{form.store === 'lekki' ? 'Lekki Store' : 'Ikeja Store'}</dd></div>
          <div><dt>Invoice</dt><dd>{form.invoiceNumber}</dd></div>
          <div><dt>Bill to</dt><dd>{form.customerName}</dd></div>
          <div><dt>Payment status</dt><dd><Status>{paymentStatusLabels[form.paymentStatus]}</Status></dd></div>
          <div><dt>Email</dt><dd>{form.customerEmail || 'Not set'}</dd></div>
          <div><dt>Subtotal</dt><dd>{money.format(subtotal)}</dd></div>
          <div><dt>Item discounts</dt><dd>-{money.format(itemDiscountTotal)}</dd></div>
          <div><dt>Elite discount</dt><dd>-{money.format(eliteDiscountAmount)}</dd></div>
          <div><dt>Store credit</dt><dd>-{money.format(toNumber(form.storeCreditApplied))}</dd></div>
          <div className="balance-line"><dt>Balance due</dt><dd>{money.format(balanceDue)}</dd></div>
        </dl>

        {message ? <div className="invoice-message">{message}</div> : null}

        <div className="invoice-actions">
          <button onClick={previewInvoice}>Preview Email HTML</button>
          <button className="primary-action" onClick={sendInvoice} disabled={sending || !form.customerEmail}>
            {sending ? 'Sending...' : 'Send Invoice Email'}
          </button>
        </div>

        {previewHtml ? (
          <iframe className="invoice-preview-frame" title="Invoice email preview" srcDoc={previewHtml} />
        ) : (
          <div className="invoice-preview-empty">Preview the email to see the exact customer invoice design.</div>
        )}
      </aside>
    </div>
  );
}

function PaymentsView() {
  return (
    <section className="panel">
      <SectionHeader eyebrow="Accounts" title="Payment Reconciliation Queue" />
      <div className="queue">
        {payments.map((payment) => (
          <article className="queue-row" key={payment.id}>
            <div>
              <strong>{payment.customer}</strong>
              <span>{payment.order} · {payment.store} · {payment.mode} · {payment.bank}</span>
            </div>
            <strong>{money.format(payment.amount)}</strong>
            <Status>{payment.status}</Status>
            <div className="row-actions">
              <button>Flag</button>
              <button className="primary-action">Confirm</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OrderSheetView({ sentInvoices = [], onCreateJob }) {
  const [sheetForm, setSheetForm] = useState({
    invoiceNumber: '',
    trackingToken: '',
    trackingUrl: '',
    customer: '',
    item: '',
    pieces: 1,
    delivery: todayIso(),
    store: 'Lekki',
    fabric: fabrics[0]?.name || '',
    measurements: '',
    designNotes: '',
    itemNote: '',
    styleImages: ['', '', '', '', ''],
  });
  const [message, setMessage] = useState('');

  const updateSheetForm = (field, value) => {
    setSheetForm((current) => ({ ...current, [field]: value }));
  };

  const updateStyleImage = (index, value) => {
    setSheetForm((current) => ({
      ...current,
      styleImages: current.styleImages.map((image, imageIndex) => (imageIndex === index ? value : image)),
    }));
  };

  const selectInvoice = (invoiceNumber) => {
    const invoice = sentInvoices.find((item) => item.invoiceNumber === invoiceNumber);
    if (!invoice) {
      updateSheetForm('invoiceNumber', '');
      return;
    }

    setSheetForm((current) => ({
      ...current,
      invoiceNumber,
      trackingToken: invoice.trackingToken || '',
      trackingUrl: invoice.trackingUrl || '',
      customer: invoice.customer || '',
      item: invoice.item || current.item,
      pieces: invoice.pieces || current.pieces,
      delivery: dateInputValue(invoice.deliveryDate, current.delivery),
      store: invoice.store || current.store,
      itemNote: invoice.itemNote || current.itemNote,
      designNotes: invoice.itemNote || current.designNotes,
    }));
  };

  const submitOrderSheet = (event) => {
    event.preventDefault();
    if (!sheetForm.invoiceNumber || !sheetForm.customer.trim() || !sheetForm.item.trim()) {
      setMessage('Select an invoice and confirm the customer and item before releasing the order sheet.');
      return;
    }

    const orderSheet = {
      id: `JOB-${Date.now().toString().slice(-6)}`,
      invoiceNumber: sheetForm.invoiceNumber,
      trackingToken: sheetForm.trackingToken,
      trackingUrl: sheetForm.trackingUrl,
      customer: sheetForm.customer.trim(),
      phone: '',
      store: sheetForm.store,
      item: sheetForm.item.trim(),
      pieces: toNumber(sheetForm.pieces) || 1,
      delivery: sheetForm.delivery,
      amount: 0,
      paid: 0,
      status: 'Unassigned',
      payment: 'Fully Paid',
      fabric: sheetForm.fabric,
      tailor: 'Unassigned',
      images: sheetForm.styleImages.filter(Boolean).length,
      styleImages: sheetForm.styleImages.filter(Boolean).map((image, index) => ({
        label: `Image ${index + 1}`,
        name: image,
      })),
      measurements: sheetForm.measurements,
      designNotes: sheetForm.designNotes,
      note: sheetForm.designNotes || sheetForm.itemNote || 'Order sheet released by Store Manager.',
      productionNote: '',
      fabricConfirmed: false,
      assignedAt: new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    };

    onCreateJob(orderSheet);
    api.post('/oms/tracking/order-sheet', {
      trackingToken: orderSheet.trackingToken,
      invoiceNumber: orderSheet.invoiceNumber,
      orderSheet,
    }).catch(() => {});

    setMessage('Order sheet released to Production.');
    setSheetForm({
      invoiceNumber: '',
      trackingToken: '',
      trackingUrl: '',
      customer: '',
      item: '',
      pieces: 1,
      delivery: todayIso(),
      store: 'Lekki',
      fabric: fabrics[0]?.name || '',
      measurements: '',
      designNotes: '',
      itemNote: '',
      styleImages: ['', '', '', '', ''],
    });
  };

  return (
    <section className="panel">
      <SectionHeader eyebrow="Store Manager" title="Create Order Sheet" />
      <form className="production-job-form order-sheet-form" onSubmit={submitOrderSheet}>
        <div className="form-stage wide-field">
          <span>1. Invoice</span>
          <label className="wide-field">Invoice number
            <select value={sheetForm.invoiceNumber} onChange={(event) => selectInvoice(event.target.value)}>
              <option value="">Select invoice to auto-fill job details</option>
              {sentInvoices.map((invoice) => (
                <option key={invoice.invoiceNumber} value={invoice.invoiceNumber}>
                  {invoice.invoiceNumber} · {invoice.customer} · {invoice.store}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-stage wide-field">
          <span>2. Customer and Item</span>
          <label>Customer name
            <input value={sheetForm.customer} onChange={(event) => updateSheetForm('customer', event.target.value)} placeholder="Customer name" />
          </label>
          <label>Item
            <input value={sheetForm.item} onChange={(event) => updateSheetForm('item', event.target.value)} placeholder="e.g. Three-piece suit" />
          </label>
        </div>

        <div className="form-stage wide-field">
          <span>3. Order Details</span>
          <label>Pieces
            <input type="number" min="1" value={sheetForm.pieces} onChange={(event) => updateSheetForm('pieces', event.target.value)} />
          </label>
          <label>Delivery date
            <input type="date" value={sheetForm.delivery} onChange={(event) => updateSheetForm('delivery', event.target.value)} />
          </label>
          <label>Store
            <select value={sheetForm.store} onChange={(event) => updateSheetForm('store', event.target.value)}>
              <option>Lekki</option>
              <option>Ikeja</option>
            </select>
          </label>
        </div>

        <div className="form-stage wide-field">
          <span>4. Measurements and Fabric</span>
          <label>Fabric
            <select value={sheetForm.fabric} onChange={(event) => updateSheetForm('fabric', event.target.value)}>
              <option value="Client supplied">Client supplied</option>
              {fabrics.map((fabric) => <option key={fabric.name} value={fabric.name}>{fabric.name}</option>)}
            </select>
          </label>
          <label className="wide-field">Measurements
            <textarea value={sheetForm.measurements} onChange={(event) => updateSheetForm('measurements', event.target.value)} placeholder="Chest, waist, inseam, sleeve, shoulder, neck..." />
          </label>
        </div>

        <div className="form-stage wide-field">
          <span>5. Design Notes and Style Images</span>
          <label className="wide-field">Design notes
            <textarea value={sheetForm.designNotes} onChange={(event) => updateSheetForm('designNotes', event.target.value)} placeholder="Internal design notes for Production" />
          </label>
          <div className="style-image-grid wide-field">
            {sheetForm.styleImages.map((image, index) => (
              <label key={`style-image-${index}`}>Image {index + 1}
                <input value={image} onChange={(event) => updateStyleImage(index, event.target.value)} placeholder={`Image ${index + 1} filename or note`} />
              </label>
            ))}
          </div>
        </div>

        {message ? <div className="invoice-message wide-field">{message}</div> : null}
        <button className="primary-action wide-field" type="submit">Release Order Sheet to Production</button>
      </form>
    </section>
  );
}

function ProductionView({ productionJobs, onUpdateJob }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const filteredJobs = productionJobs.filter((job) => (
    statusFilter === 'All' ? true : job.status === statusFilter
  ));

  return (
    <div className="production-board">
      <section className="panel span-2 production-jobs-panel">
        <SectionHeader eyebrow="Production" title="Active Job Sheets">
          <button>View all jobs</button>
        </SectionHeader>
        <div className="production-tabs">
          {['All', 'In Progress', 'Ready'].map((tab) => (
            <button
              key={tab}
              className={statusFilter === tab ? 'active' : ''}
              onClick={() => setStatusFilter(tab)}
            >
              {tab} <span>{tab === 'All' ? productionJobs.length : productionJobs.filter((job) => job.status === tab).length}</span>
            </button>
          ))}
        </div>
        <div className="job-list production-job-list">
          {filteredJobs.map((order) => (
            <article className="job-card" key={order.id}>
              <div className="job-line production-job-head">
                <div className="avatar">{order.customer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div>
                  <strong>{order.customer}</strong>
                  <span>{order.item}</span>
                  <span>{order.delivery}</span>
                </div>
                <Status>{order.status}</Status>
              </div>
              <div className="job-detail">
                <dl>
                  <div><dt>Fabric</dt><dd>{order.fabric} · {order.fabricConfirmed ? 'Confirmed' : 'Not confirmed'}</dd></div>
                  <div><dt>Tailor</dt><dd>{order.tailor}</dd></div>
                  <div><dt>Images</dt><dd>{order.images || 0} labelled references</dd></div>
                  <div><dt>Measurements</dt><dd>{order.measurements ? 'Included' : 'Not added'}</dd></div>
                </dl>
                <div className="production-controls">
                  <label>Tailor
                    <select value={order.tailor} onChange={(event) => onUpdateJob(order.id, {
                      tailor: event.target.value,
                      status: event.target.value === 'Unassigned' ? 'Unassigned' : 'In Progress',
                    })}>
                      <option>Unassigned</option>
                      {tailorOptions.map((tailor) => <option key={tailor.name}>{tailor.name}</option>)}
                    </select>
                  </label>
                  <label>Fabric
                    <select value={order.fabric} onChange={(event) => onUpdateJob(order.id, {
                      fabric: event.target.value,
                      fabricConfirmed: false,
                    })}>
                      <option value="Client supplied">Client supplied</option>
                      {fabrics.map((fabric) => <option key={fabric.name} value={fabric.name}>{fabric.name}</option>)}
                    </select>
                  </label>
                  <label className="wide-field">Production style note
                    <textarea value={order.productionNote || ''} onChange={(event) => onUpdateJob(order.id, { productionNote: event.target.value })} placeholder="Production Manager instruction for Tailor" />
                  </label>
                </div>
                <p className="note">{order.designNotes || order.note}</p>
                <div className="row-actions">
                  <button onClick={() => onUpdateJob(order.id, { fabricConfirmed: true })}>Confirm Fabric</button>
                  <button onClick={() => onUpdateJob(order.id, { status: 'In Progress' })}>In Progress</button>
                  <button className="primary-action" onClick={() => onUpdateJob(order.id, { status: 'Ready' })}>Mark Ready</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Tailors" title="Availability" />
        <div className="mini-list">
          {tailorOptions.map((tailor) => (
            <span key={tailor.name}>{tailor.name} · {tailor.department} · Grade {tailor.grade}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function InventoryView() {
  return (
    <section className="panel">
      <SectionHeader eyebrow="Inventory" title="Fabric Ledger">
        <button className="primary-action">Record Stock In</button>
      </SectionHeader>
      <div className="fabric-grid">
        {fabrics.map((fabric) => (
          <article className="fabric-card" key={fabric.name}>
            <div>
              <h3>{fabric.name}</h3>
              <Status>{fabric.status}</Status>
            </div>
            <p>{fabric.type}</p>
            <strong>{fabric.qty} {fabric.unit}</strong>
            <small>Low stock threshold: {fabric.threshold} {fabric.unit}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function StaffView() {
  return (
    <section className="panel">
      <SectionHeader eyebrow="Owner Control" title="Staff Management">
        <button className="primary-action">Add Staff</button>
      </SectionHeader>
      <OrderTableLike
        columns={['Name', 'Role', 'Store', 'Status', 'Last login']}
        rows={staff.map((person) => [person.name, person.role, person.store, person.status, person.lastLogin])}
      />
    </section>
  );
}

function ReportsView() {
  return (
    <div className="stack">
      <section className="metrics-grid">
        <Stat label="July revenue" value={money.format(6840000)} detail="Across both stores" />
        <Stat label="Outstanding balances" value={money.format(910000)} detail="7 customer profiles" tone="gold" />
        <Stat label="Tailor output" value="42" detail="Completed this month" />
        <Stat label="Fabric spend" value={money.format(1240000)} detail="Confirmed stock-in" />
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Exports" title="End-of-Period Reports">
          <button className="primary-action">Export PDF</button>
        </SectionHeader>
        <div className="report-bars">
          <span style={{ '--value': '78%' }}>Lekki revenue</span>
          <span style={{ '--value': '52%' }}>Ikeja revenue</span>
          <span style={{ '--value': '64%' }}>Confirmed transfers</span>
          <span style={{ '--value': '38%' }}>POS payments</span>
        </div>
      </section>
    </div>
  );
}

function TailorTasks({ compact = false, productionJobs = [], onUpdateJob }) {
  const assignedJobs = productionJobs.filter((order) => order.tailor !== 'Unassigned');

  return (
    <section className="panel">
      <SectionHeader eyebrow="My Tasks" title={compact ? 'Assigned This Week' : 'Tailor Work Queue'} />
      <div className="job-list">
        {assignedJobs.length ? assignedJobs.map((order) => (
          <article className="job-card" key={order.id}>
            <div className="job-line">
              <strong>{order.customer}</strong>
              <span>{order.item}</span>
              <span>{order.delivery}</span>
              <Status>{order.status === 'Ready' ? 'Ready' : 'In Progress'}</Status>
            </div>
            <div className="job-detail">
              <p className="production-note">Production Style Note: {order.productionNote || order.note}</p>
              <p>{order.note}</p>
              <dl>
                <div><dt>Pieces</dt><dd>{order.pieces}</dd></div>
                <div><dt>Fabric</dt><dd>{order.fabric}</dd></div>
                <div><dt>Fabric status</dt><dd>{order.fabricConfirmed ? 'Confirmed' : 'Pending'}</dd></div>
                <div><dt>Assigned</dt><dd>{order.assignedAt || 'Today'}</dd></div>
              </dl>
              <div className="row-actions">
                <button onClick={() => onUpdateJob?.(order.id, { status: 'In Progress' })}>In Progress</button>
                <button className="primary-action" onClick={() => onUpdateJob?.(order.id, { status: 'Ready' })}>Ready</button>
              </div>
            </div>
          </article>
        )) : (
          <div className="invoice-preview-empty">Assigned jobs will appear here once Production Manager assigns a tailor.</div>
        )}
      </div>
    </section>
  );
}

function WeeklyLogView({ productionJobs = [] }) {
  const assignedJobs = productionJobs.filter((order) => order.tailor !== 'Unassigned');

  return (
    <section className="panel">
      <SectionHeader eyebrow="Log Sheet" title="Weekly and Monthly Aggregation" />
      <OrderTableLike
        columns={['Task', 'Date assigned', 'Status', 'Logged at']}
        rows={(assignedJobs.length ? assignedJobs : initialProductionJobs.filter((order) => order.tailor !== 'Unassigned')).map((order) => [
          order.item,
          order.assignedAt || 'Today',
          order.status === 'Ready' ? 'Ready' : 'In Progress',
          order.status === 'Ready' ? 'Marked ready' : 'Active',
        ])}
      />
    </section>
  );
}

function NotificationPanel() {
  return (
    <section className="panel">
      <SectionHeader eyebrow="Inbox" title="Notifications" />
      <div className="notification-list">
        {notifications.map((item) => (
          <article key={`${item.channel}-${item.time}`}>
            <span>{item.channel}</span>
            <p>{item.text}</p>
            <small>{item.time}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function PortalPreview() {
  return (
    <section className="portal-preview">
      <div className="brand-rule">CUSTOMER PORTAL</div>
      <h2>Ken Mbachu</h2>
      <p>Elite member since 14 Feb 2026. Your 5% discount is active on all orders.</p>
      <div className="portal-orders">
        <article>
          <span>Active Order</span>
          <strong>Three-piece suit</strong>
          <p>In Progress · Delivery 12 Jul 2026 · Paid {money.format(400000)}</p>
        </article>
        <article>
          <span>Measurements</span>
          <strong>Saved profile</strong>
          <p>Chest, waist, inseam, sleeve, shoulder, neck, and preferred fit stored securely.</p>
        </article>
      </div>
    </section>
  );
}

function CustomerTrackingPage({ token, productionJobs = [], sentInvoices = [] }) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.get(`/oms/track/${token}`)
      .then((response) => {
        if (!cancelled) setTracking(response.data?.data?.tracking || null);
      })
      .catch(() => {
        const job = productionJobs.find((item) => item.trackingToken === token);
        const invoice = sentInvoices.find((item) => item.trackingToken === token);
        if (!cancelled) {
          setTracking(job ? {
            invoiceNumber: job.invoiceNumber,
            customer: job.customer,
            store: job.store,
            item: job.item,
            pieces: job.pieces,
            deliveryDate: job.delivery,
            status: job.status,
            fabric: job.fabric,
            measurementsAdded: Boolean(job.measurements),
            designNotesAdded: Boolean(job.designNotes),
            styleImagesCount: job.images || 0,
            lastUpdatedAt: job.updatedAt || job.assignedAt,
          } : invoice ? {
            invoiceNumber: invoice.invoiceNumber,
            customer: invoice.customer,
            store: invoice.store,
            item: invoice.item,
            pieces: invoice.pieces,
            deliveryDate: invoice.deliveryDate,
            status: 'Order Sheet Pending',
            styleImagesCount: 0,
          } : null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, productionJobs, sentInvoices]);

  const normalizedStatus = tracking?.status || 'Order Sheet Pending';
  const steps = ['Order Sheet Pending', 'Unassigned', 'In Progress', 'Ready'];
  const currentStep = Math.max(0, steps.indexOf(normalizedStatus));

  if (loading) {
    return (
      <main className="tracking-page">
        <section className="tracking-card">
          <div className="brand-lockup tracking-brand"><div className="mark">TW</div><strong>TWIF</strong></div>
          <p>Loading order status...</p>
        </section>
      </main>
    );
  }

  if (!tracking) {
    return (
      <main className="tracking-page">
        <section className="tracking-card">
          <div className="brand-lockup tracking-brand"><div className="mark">TW</div><strong>TWIF</strong></div>
          <h1>Tracking Link Not Found</h1>
          <p>Please confirm the invoice link with The Way It Fits.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="tracking-page">
      <section className="tracking-card">
        <div className="tracking-top">
          <div className="brand-lockup tracking-brand">
            <div className="mark">TW</div>
            <div>
              <strong>TWIF</strong>
              <span>The Way It Fits</span>
            </div>
          </div>
          <Status>{normalizedStatus}</Status>
        </div>

        <div className="tracking-hero">
          <span>{tracking.invoiceNumber}</span>
          <h1>{tracking.item || 'Your order'}</h1>
          <p>{tracking.customer} · {tracking.store} Store</p>
        </div>

        <div className="tracking-steps">
          {steps.map((step, index) => (
            <div className={classNames('tracking-step', index <= currentStep && 'active')} key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>

        <dl className="tracking-details">
          <div><dt>Delivery date</dt><dd>{tracking.deliveryDate || 'To be confirmed'}</dd></div>
          <div><dt>Pieces</dt><dd>{tracking.pieces || 1}</dd></div>
          <div><dt>Fabric</dt><dd>{tracking.fabric || 'To be confirmed'}</dd></div>
          <div><dt>Style images</dt><dd>{tracking.styleImagesCount || 0} uploaded</dd></div>
        </dl>

        <p className="tracking-note">
          This page updates from the order sheet and production status managed by TWIF staff.
        </p>
      </section>
    </main>
  );
}

function OrderTableLike({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('-')}>
              {row.map((cell, index) => <td data-label={columns[index]} key={cell}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderView(activeView, role, viewProps = {}) {
  if (activeView === 'Overview') return <Overview role={role} productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Orders') return <OrdersView sentInvoices={viewProps.sentInvoices} />;
  if (activeView === 'Customers') return <CustomersView />;
  if (activeView === 'New Invoice') return <NewInvoiceView currentRole={viewProps.currentRole} onInvoiceSent={viewProps.onInvoiceSent} />;
  if (activeView === 'Order Sheet') return <OrderSheetView sentInvoices={viewProps.sentInvoices} onCreateJob={viewProps.onCreateJob} />;
  if (activeView === 'Payments') return <PaymentsView />;
  if (activeView === 'Production') return <ProductionView productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Inventory') return <InventoryView />;
  if (activeView === 'Staff') return <StaffView />;
  if (activeView === 'Reports') return <ReportsView />;
  if (activeView === 'My Tasks') return <TailorTasks productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Weekly Log') return <WeeklyLogView productionJobs={viewProps.productionJobs} />;
  if (activeView === 'Notifications') return <NotificationPanel />;
  return <Overview role={role} />;
}

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState(null);
  const visibleNav = navByRole[role];
  const [activeView, setActiveView] = useState('Overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sentInvoices, setSentInvoices] = useState(loadSentInvoices);
  const [productionJobs, setProductionJobs] = useState(() => {
    const storedJobs = loadStoredProductionJobs();
    return storedJobs.length ? storedJobs : initialProductionJobs;
  });

  const currentRole = useMemo(() => roles.find((item) => item.id === role), [role]);

  useEffect(() => {
    localStorage.setItem(SENT_INVOICES_KEY, JSON.stringify(sentInvoices));
  }, [sentInvoices]);

  useEffect(() => {
    localStorage.setItem(PRODUCTION_JOBS_KEY, JSON.stringify(productionJobs));
  }, [productionJobs]);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;

    api.get('/oms/invoices/sent')
      .then((response) => {
        if (cancelled) return;
        const invoices = response.data?.data?.invoices || [];
        setSentInvoices(invoices);
      })
      .catch(() => {
        // Keep the local cache visible if the API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const recordSentInvoice = (invoice) => {
    setSentInvoices((current) => [
      invoice,
      ...current.filter((item) => item.invoiceNumber !== invoice.invoiceNumber),
    ]);
  };

  const createProductionJob = (job) => {
    setProductionJobs((current) => [job, ...current]);
  };

  const updateProductionJob = (jobId, changes) => {
    let updatedJob;
    setProductionJobs((current) => current.map((job) => {
      if (job.id !== jobId) return job;
      updatedJob = { ...job, ...changes };
      return updatedJob;
    }));

    if (updatedJob?.trackingToken) {
      api.patch(`/oms/tracking/order-sheet/${updatedJob.trackingToken}`, updatedJob).catch(() => {});
    }
  };

  const handleLogin = (account) => {
    setRole(account.role);
    setActiveView(navByRole[account.role][0]);
    setSignedIn(true);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setSignedIn(false);
    setRole(null);
    setActiveView('Overview');
    setMobileMenuOpen(false);
  };

  const openView = (view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const trackingMatch = window.location.pathname.match(/^\/c\/([^/?#]+)/);
  if (trackingMatch) {
    return (
      <CustomerTrackingPage
        token={decodeURIComponent(trackingMatch[1])}
        productionJobs={productionJobs}
        sentInvoices={sentInvoices}
      />
    );
  }

  if (!signedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className={classNames('app-shell', mobileMenuOpen && 'menu-open')}>
      {mobileMenuOpen && <button className="drawer-scrim" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-lockup">
          <div className="mark">TW</div>
          <div>
            <strong>TWIF</strong>
            <span>The Way It Fits</span>
          </div>
        </div>
        <nav>
          {visibleNav.map((item) => (
            <button
              className={item === activeView ? 'active' : ''}
              key={item}
              onClick={() => openView(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <button className="portal-link" onClick={() => openView('Portal Preview')}>Portal Preview</button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button
            className="menu-button"
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <span className="eyebrow">Operations Management System</span>
            <span className="mobile-app-label">TWIF OMS</span>
            <h1>{activeView === 'Portal Preview' ? 'Customer Tracking Preview' : activeView}</h1>
          </div>
          <div className="topbar-actions">
            <div className="user-chip">
              <span>{currentRole?.name}</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </header>

        {activeView === 'Portal Preview' ? (
          <PortalPreview />
        ) : renderView(activeView, role, {
          currentRole,
          onInvoiceSent: recordSentInvoice,
          sentInvoices,
          productionJobs,
          onCreateJob: createProductionJob,
          onUpdateJob: updateProductionJob,
        })}
      </main>
    </div>
  );
}

export default App;
