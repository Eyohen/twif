import { useEffect, useMemo, useRef, useState } from 'react';
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

const trackingBaseUrl = (
  import.meta.env.VITE_TRACKING_BASE_URL ||
  window.location.origin ||
  'http://localhost:5173'
).replace(/\/+$/, '');

const trackingUrlForToken = (token) => `${trackingBaseUrl}/c/${token}`;

const toNumber = (value) => Number(value) || 0;

const dateInputValue = (value, fallback = todayIso()) => {
  if (!value) return fallback;
  return String(value).slice(0, 10);
};

const customerStatus = (status) => {
  if (status === 'Ready' || status === 'Ready for Collection') return 'Ready for Collection';
  return 'In Progress';
};

const paymentStatusLabels = {
  partial_paid: 'Partial Paid',
  fully_paid: 'Fully Paid',
};

const invoiceApprovalStatus = (invoice) => invoice?.accountApprovalStatus || 'Pending Accounts';

const isInvoiceApproved = (invoice) => invoiceApprovalStatus(invoice) === 'Approved';

const canShowJobInProduction = (job, invoices) => {
  if (!job.invoiceNumber) return true;
  const invoice = invoices.find((item) => item.invoiceNumber === job.invoiceNumber);
  return isInvoiceApproved(invoice);
};

const productionJobFromInvoice = (invoice) => {
  if (!invoice?.orderSheet) return null;
  const sheet = invoice.orderSheet;
  const styleImages = Array.isArray(sheet.styleImages) ? sheet.styleImages : [];

  return {
    id: sheet.id || `JOB-${invoice.invoiceNumber}`,
    invoiceNumber: invoice.invoiceNumber,
    trackingToken: sheet.trackingToken || invoice.trackingToken,
    trackingUrl: sheet.trackingUrl || invoice.trackingUrl,
    customer: sheet.customer || invoice.customer || '',
    phone: sheet.phone || '',
    store: sheet.store || invoice.store || 'Lekki',
    item: sheet.item || invoice.item || '',
    pieces: toNumber(sheet.pieces || invoice.pieces) || 1,
    delivery: sheet.delivery || dateInputValue(invoice.deliveryDate),
    amount: toNumber(sheet.amount),
    paid: toNumber(sheet.paid),
    status: sheet.status || 'Order Sheet Confirmed',
    requiresAccountApproval: true,
    payment: sheet.payment || invoice.paymentStatus || 'Fully Paid',
    fabric: sheet.fabric || '',
    fabricId: sheet.fabricId || '',
    tailor: sheet.tailor || 'Unassigned',
    images: toNumber(sheet.images) || styleImages.length,
    styleImages,
    measurements: sheet.measurements || '',
    designNotes: sheet.designNotes || '',
    note: sheet.note || sheet.designNotes || invoice.itemNote || '',
    productionNote: sheet.productionNote || '',
    fabricConfirmed: Boolean(sheet.fabricConfirmed),
    fabricAllocated: Boolean(sheet.fabricAllocated),
    fabricUsage: sheet.fabricUsage || '',
    fabricUnit: sheet.fabricUnit || '',
    assignedAt: sheet.assignedAt || 'Pending assignment',
    updatedAt: sheet.updatedAt,
  };
};

const mergeJobsByInvoice = (currentJobs, incomingJobs) => {
  const validIncoming = incomingJobs.filter(Boolean);
  if (!validIncoming.length) return currentJobs;

  const incomingInvoiceNumbers = new Set(validIncoming.map((job) => job.invoiceNumber));
  return [
    ...validIncoming,
    ...currentJobs.filter((job) => !incomingInvoiceNumbers.has(job.invoiceNumber)),
  ];
};

const inventoryCategories = [
  'Suiting',
  'Shirting',
  'Jacket',
  'Trouser',
  'Native',
  'Bridal',
  'Lining',
  'Trim',
  'Accessories',
  'Cloth',
  'Add Ons',
];

const navByRole = {
  owner: ['Overview', 'Orders', 'Customers', 'Payments', 'Production', 'Inventory', 'Staff', 'Reports', 'Notifications'],
  admin: ['Overview', 'Orders', 'Customers', 'Payments', 'Production', 'Inventory', 'Staff', 'Reports', 'Notifications'],
  store_manager: ['Overview', 'Orders', 'Customers', 'New Invoice', 'Order Sheet', 'Notifications'],
  accounts: ['Overview', 'Payments', 'Reports', 'Notifications'],
  production_manager: ['Overview', 'Production', 'Inventory', 'Notifications'],
  inventory_manager: ['Overview', 'Inventory', 'Notifications'],
  tailor: ['Overview', 'My Tasks', 'Weekly Log', 'Notifications'],
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

function Overview({ role, currentRole, sentInvoices = [], productionJobs = [], onUpdateJob }) {
  const isTailor = role === 'tailor';

  if (isTailor) {
    return <TailorOverview currentRole={currentRole} productionJobs={productionJobs} onUpdateJob={onUpdateJob} />;
  }

  if (role === 'inventory_manager') {
    return <InventoryOverview />;
  }

  if (role === 'production_manager') {
    return <ProductionOverview productionJobs={productionJobs} />;
  }

  return <OperationsOverview role={role} sentInvoices={sentInvoices} productionJobs={productionJobs} />;
}

function OperationsOverview({ role, sentInvoices = [], productionJobs = [] }) {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.get('/oms/fabrics')
      .then((response) => setInventory(response.data?.data?.fabrics || []))
      .catch(() => setInventory([]));
  }, []);

  const approved = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Approved');
  const pendingAccounts = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts');
  const partialPayments = sentInvoices.filter((invoice) => invoice.paymentStatus === 'Partial Paid');
  const readyJobs = productionJobs.filter((job) => job.status === 'Ready');
  const activeJobs = productionJobs.filter((job) => job.status !== 'Ready');
  const lowStock = inventory.filter((item) => toNumber(item.quantity) <= toNumber(item.lowStockThreshold));
  const invoiceTotal = sentInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const metricSets = {
    accounts: [
      { label: 'Awaiting review', value: pendingAccounts.length, detail: 'Pending Accounts approval', tone: pendingAccounts.length ? 'gold' : undefined },
      { label: 'Approved invoices', value: approved.length, detail: `${sentInvoices.length} invoices received` },
      { label: 'Partial payments', value: partialPayments.length, detail: 'Outstanding payment status', tone: partialPayments.length ? 'alert' : undefined },
      { label: 'Total invoiced', value: money.format(invoiceTotal), detail: 'Across live invoice records' },
    ],
    store_manager: [
      { label: 'Invoices sent', value: sentInvoices.length, detail: 'Live customer invoices' },
      { label: 'Pending approval', value: pendingAccounts.length, detail: 'Waiting for Accounts', tone: pendingAccounts.length ? 'gold' : undefined },
      { label: 'Active orders', value: activeJobs.length, detail: 'Currently in production' },
      { label: 'Ready orders', value: readyJobs.length, detail: 'Ready for customer handoff' },
    ],
    owner: [
      { label: 'Invoices', value: sentInvoices.length, detail: money.format(invoiceTotal) },
      { label: 'Active production', value: activeJobs.length, detail: `${productionJobs.length} total job sheets` },
      { label: 'Ready orders', value: readyJobs.length, detail: 'Awaiting handoff' },
      { label: 'Low stock', value: lowStock.length, detail: `${inventory.length} inventory records`, tone: lowStock.length ? 'alert' : undefined },
    ],
    admin: [
      { label: 'Invoices', value: sentInvoices.length, detail: money.format(invoiceTotal) },
      { label: 'Pending Accounts', value: pendingAccounts.length, detail: 'Requiring approval', tone: pendingAccounts.length ? 'gold' : undefined },
      { label: 'Production jobs', value: productionJobs.length, detail: `${readyJobs.length} ready` },
      { label: 'Low stock', value: lowStock.length, detail: `${inventory.length} inventory records`, tone: lowStock.length ? 'alert' : undefined },
    ],
  };
  const metrics = metricSets[role] || metricSets.owner;

  return (
    <div className="stack operations-overview">
      <section className="metrics-grid">
        {metrics.map((metric) => <Stat key={metric.label} label={metric.label} value={String(metric.value)} detail={metric.detail} tone={metric.tone} />)}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Live records" title={role === 'accounts' ? 'Invoice Review Queue' : 'Recent Orders'} />
        {sentInvoices.length ? (
          <div className="table-wrap">
            <table className="operations-overview-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Store</th><th>Total</th><th>Payment</th><th>Accounts</th><th>Order</th></tr></thead>
              <tbody>{sentInvoices.slice(0, 10).map((invoice) => (
                <tr key={invoice.invoiceNumber}>
                  <td data-label="Invoice"><strong>{invoice.invoiceNumber}</strong></td>
                  <td data-label="Customer">{invoice.customer}</td>
                  <td data-label="Store">{invoice.store}</td>
                  <td data-label="Total">{money.format(invoice.total)}</td>
                  <td data-label="Payment"><Status>{invoice.paymentStatus}</Status></td>
                  <td data-label="Accounts"><Status>{invoiceApprovalStatus(invoice)}</Status></td>
                  <td data-label="Order"><Status>{invoice.orderStatus}</Status></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="invoice-preview-empty">No invoice or order records are available yet.</div>}
      </section>

      {(role === 'owner' || role === 'admin') ? (
        <section className="operations-health-grid">
          <div className="panel"><SectionHeader eyebrow="Production" title="Current Workload" /><div className="inventory-category-list"><div><span>Active</span><strong>{activeJobs.length}</strong></div><div><span>Ready</span><strong>{readyJobs.length}</strong></div><div><span>Unassigned</span><strong>{productionJobs.filter((job) => !job.tailor || job.tailor === 'Unassigned').length}</strong></div></div></div>
          <div className="panel"><SectionHeader eyebrow="Inventory" title="Stock Health" /><div className="inventory-category-list"><div><span>Healthy</span><strong>{inventory.length - lowStock.length}</strong></div><div><span>Low or out</span><strong>{lowStock.length}</strong></div><div><span>Total records</span><strong>{inventory.length}</strong></div></div></div>
        </section>
      ) : null}
    </div>
  );
}

function TailorOverview({ currentRole, productionJobs = [], onUpdateJob }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const myJobs = productionJobs.filter((job) => job.tailor === tailorName);
  const readyJobs = myJobs.filter((job) => job.status === 'Ready');
  const activeJobs = myJobs.filter((job) => job.status !== 'Ready');
  const inProgressJobs = myJobs.filter((job) => job.status === 'In Progress');
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(now.getDate() + 7);
  const dueSoon = activeJobs.filter((job) => {
    const deliveryDate = new Date(job.delivery);
    return !Number.isNaN(deliveryDate.getTime()) && deliveryDate >= now && deliveryDate <= inSevenDays;
  });
  const overdueJobs = activeJobs.filter((job) => {
    const deliveryDate = new Date(job.delivery);
    return !Number.isNaN(deliveryDate.getTime()) && deliveryDate < now;
  });
  const preparationPending = activeJobs.filter((job) => !job.fabricConfirmed || !job.measurements);
  const sortedActiveJobs = [...activeJobs].sort((a, b) => {
    const first = new Date(a.delivery).getTime();
    const second = new Date(b.delivery).getTime();
    if (Number.isNaN(first)) return 1;
    if (Number.isNaN(second)) return -1;
    return first - second;
  });

  return (
    <div className="stack tailor-overview">
      <section className="metrics-grid">
        <Stat label="My active tasks" value={String(activeJobs.length)} detail={`${myJobs.length} total assignments`} />
        <Stat label="In progress" value={String(inProgressJobs.length)} detail="Currently being worked on" />
        <Stat label="Due in 7 days" value={String(dueSoon.length)} detail={`${overdueJobs.length} overdue`} tone={overdueJobs.length ? 'alert' : 'gold'} />
        <Stat label="Ready" value={String(readyJobs.length)} detail="Marked complete" />
      </section>

      <section className="panel">
        <SectionHeader eyebrow="My schedule" title="Priority Task Queue" />
        {sortedActiveJobs.length ? (
          <div className="job-list production-job-list tailor-priority-list">
            {sortedActiveJobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-line production-job-head">
                  <div className="avatar">{job.customer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                  <div><strong>{job.customer}</strong><span>{job.item}</span><span>Delivery {job.delivery || 'not set'}</span></div>
                  <Status>{job.status}</Status>
                </div>
                <div className="job-detail">
                  <dl>
                    <div><dt>Pieces</dt><dd>{job.pieces || 1}</dd></div>
                    <div><dt>Fabric</dt><dd>{job.fabric || 'Not selected'}</dd></div>
                    <div><dt>Fabric status</dt><dd>{job.fabricConfirmed ? 'Confirmed' : 'Pending'}</dd></div>
                    <div><dt>Measurements</dt><dd>{job.measurements ? 'Included' : 'Missing'}</dd></div>
                  </dl>
                  {(job.productionNote || job.designNotes || job.note) ? <p className="production-note">{job.productionNote || job.designNotes || job.note}</p> : null}
                  <div className="row-actions">
                    <button disabled={job.status === 'In Progress'} onClick={() => onUpdateJob?.(job.id, { status: 'In Progress' })}>Start Work</button>
                    <button className="primary-action" onClick={() => onUpdateJob?.(job.id, { status: 'Ready' })}>Mark Ready</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="invoice-preview-empty">You have no active assigned tasks.</div>}
      </section>

      <section className="tailor-overview-grid">
        <div className="panel">
          <SectionHeader eyebrow="Before sewing" title="Preparation Pending" />
          <div className="production-summary-list">
            {preparationPending.length ? preparationPending.map((job) => (
              <article key={job.id}>
                <div><strong>{job.customer}</strong><Status>Attention</Status></div>
                <span>{!job.fabricConfirmed ? 'Fabric not confirmed' : ''}{!job.fabricConfirmed && !job.measurements ? ' · ' : ''}{!job.measurements ? 'Measurements missing' : ''}</span>
              </article>
            )) : <div className="invoice-preview-empty">All active tasks have fabric and measurements ready.</div>}
          </div>
        </div>

        <div className="panel">
          <SectionHeader eyebrow="Completed work" title="Recently Ready" />
          <div className="production-summary-list">
            {readyJobs.length ? readyJobs.slice(0, 6).map((job) => (
              <article key={job.id}><div><strong>{job.customer}</strong><Status>Ready</Status></div><span>{job.item} · Delivery {job.delivery || 'not set'}</span></article>
            )) : <div className="invoice-preview-empty">No completed tasks yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductionOverview({ productionJobs = [] }) {
  const readyJobs = productionJobs.filter((job) => job.status === 'Ready');
  const unassignedJobs = productionJobs.filter((job) => !job.tailor || job.tailor === 'Unassigned');
  const fabricPending = productionJobs.filter((job) => !job.fabricConfirmed);
  const activeJobs = productionJobs.filter((job) => job.status !== 'Ready');
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(now.getDate() + 7);
  const dueSoon = activeJobs.filter((job) => {
    const deliveryDate = new Date(job.delivery);
    return !Number.isNaN(deliveryDate.getTime()) && deliveryDate >= now && deliveryDate <= inSevenDays;
  });
  const overdueJobs = activeJobs.filter((job) => {
    const deliveryDate = new Date(job.delivery);
    return !Number.isNaN(deliveryDate.getTime()) && deliveryDate < now;
  });
  const tailorWorkload = productionJobs.reduce((workload, job) => {
    if (!job.tailor || job.tailor === 'Unassigned' || job.status === 'Ready') return workload;
    workload[job.tailor] = (workload[job.tailor] || 0) + 1;
    return workload;
  }, {});
  const priorityJobs = [...activeJobs].sort((a, b) => {
    const first = new Date(a.delivery).getTime();
    const second = new Date(b.delivery).getTime();
    if (Number.isNaN(first)) return 1;
    if (Number.isNaN(second)) return -1;
    return first - second;
  });

  return (
    <div className="stack production-overview">
      <section className="metrics-grid">
        <Stat label="Active jobs" value={String(activeJobs.length)} detail={`${productionJobs.length} total job sheets`} />
        <Stat label="Unassigned" value={String(unassignedJobs.length)} detail="Waiting for a tailor" tone={unassignedJobs.length ? 'alert' : undefined} />
        <Stat label="Due in 7 days" value={String(dueSoon.length)} detail={`${overdueJobs.length} overdue`} tone={overdueJobs.length ? 'alert' : 'gold'} />
        <Stat label="Ready" value={String(readyJobs.length)} detail="Awaiting collection or handoff" />
      </section>

      <section className="production-overview-grid">
        <div className="panel">
          <SectionHeader eyebrow="Work schedule" title="Priority Production Queue" />
          {priorityJobs.length ? (
            <div className="table-wrap">
              <table className="production-overview-table">
                <thead><tr><th>Delivery</th><th>Customer</th><th>Item</th><th>Tailor</th><th>Fabric</th><th>Status</th></tr></thead>
                <tbody>{priorityJobs.slice(0, 10).map((job) => (
                  <tr key={job.id}>
                    <td data-label="Delivery"><strong>{job.delivery || 'Not set'}</strong></td>
                    <td data-label="Customer">{job.customer}</td>
                    <td data-label="Item">{job.item}</td>
                    <td data-label="Tailor">{job.tailor || 'Unassigned'}</td>
                    <td data-label="Fabric"><Status>{job.fabricConfirmed ? 'Confirmed' : 'Pending'}</Status></td>
                    <td data-label="Status"><Status>{job.status}</Status></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="invoice-preview-empty">No active production jobs.</div>}
        </div>

        <div className="panel">
          <SectionHeader eyebrow="Team capacity" title="Tailor Workload" />
          <div className="inventory-category-list">
            {Object.entries(tailorWorkload).length ? Object.entries(tailorWorkload)
              .sort(([first], [second]) => first.localeCompare(second))
              .map(([tailor, workload]) => (
              <div key={tailor}>
                <span>{tailor}<small>Active assignments</small></span>
                <strong>{workload}</strong>
              </div>
              )) : <div className="invoice-preview-empty">No tailors have active assignments.</div>}
          </div>
        </div>
      </section>

      <section className="production-overview-alerts">
        <div className="panel">
          <SectionHeader eyebrow="Action required" title="Unassigned Jobs" />
          <div className="production-summary-list">
            {unassignedJobs.length ? unassignedJobs.slice(0, 6).map((job) => (
              <article key={job.id}><div><strong>{job.customer}</strong><Status>{job.status}</Status></div><span>{job.item} · Delivery {job.delivery || 'not set'}</span></article>
            )) : <div className="invoice-preview-empty">Every active job has a tailor.</div>}
          </div>
        </div>

        <div className="panel">
          <SectionHeader eyebrow="Materials" title="Fabric Confirmation Pending" />
          <div className="production-summary-list">
            {fabricPending.length ? fabricPending.slice(0, 6).map((job) => (
              <article key={job.id}><div><strong>{job.customer}</strong><Status>Pending</Status></div><span>{job.fabric || 'Fabric not selected'} · {job.item}</span></article>
            )) : <div className="invoice-preview-empty">Fabric is confirmed for every production job.</div>}
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Latest updates" title="Recent Production Activity" />
        <div className="inventory-recent-list">
          {[...productionJobs].sort((a, b) => new Date(b.updatedAt || b.assignedAt) - new Date(a.updatedAt || a.assignedAt)).slice(0, 6).map((job) => (
            <article key={job.id}>
              <div><strong>{job.customer}</strong><Status>{job.status}</Status></div>
              <span>{job.item} · {job.tailor || 'Unassigned'}</span>
              <small>{job.updatedAt ? `Updated ${new Date(job.updatedAt).toLocaleString('en-GB')}` : `Assigned ${job.assignedAt || 'pending'}`}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function InventoryOverview() {
  const [inventory, setInventory] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/oms/fabrics'), api.get('/oms/fabrics/allocations')])
      .then(([inventoryResponse, allocationResponse]) => {
        setInventory(inventoryResponse.data?.data?.fabrics || []);
        setAllocations(allocationResponse.data?.data?.allocations || []);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load inventory overview.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section className="panel"><div className="invoice-preview-empty">Loading inventory overview...</div></section>;
  if (error) return <section className="panel"><div className="invoice-message">{error}</div></section>;

  const lowStock = inventory.filter((item) => toNumber(item.quantity) <= toNumber(item.lowStockThreshold));
  const outOfStock = inventory.filter((item) => toNumber(item.quantity) === 0);
  const healthyStock = inventory.length - lowStock.length;
  const today = todayIso();
  const todayAllocations = allocations.filter((item) => String(item.createdAt).slice(0, 10) === today);
  const categoryCounts = inventory.reduce((counts, item) => ({
    ...counts,
    [item.type]: (counts[item.type] || 0) + 1,
  }), {});

  return (
    <div className="stack inventory-overview">
      <section className="metrics-grid">
        <Stat label="Inventory items" value={String(inventory.length)} detail={`${Object.keys(categoryCounts).length} categories`} />
        <Stat label="Healthy stock" value={String(healthyStock)} detail="Above reorder threshold" />
        <Stat label="Low stock" value={String(lowStock.length)} detail={`${outOfStock.length} currently out of stock`} tone="alert" />
        <Stat label="Allocated today" value={String(todayAllocations.length)} detail="Production usage entries" tone="gold" />
      </section>

      <section className="inventory-overview-grid">
        <div className="panel">
          <SectionHeader eyebrow="Attention required" title="Low-Stock Items" />
          {lowStock.length ? (
            <div className="table-wrap">
              <table className="inventory-overview-table">
                <thead><tr><th>Item</th><th>Category</th><th>Remaining</th><th>Threshold</th><th>Status</th></tr></thead>
                <tbody>{lowStock.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Item"><strong>{item.name}</strong></td>
                    <td data-label="Category">{item.type}</td>
                    <td data-label="Remaining">{toNumber(item.quantity)} {item.unit}</td>
                    <td data-label="Threshold">{toNumber(item.lowStockThreshold)} {item.unit}</td>
                    <td data-label="Status"><Status>{toNumber(item.quantity) === 0 ? 'Out of Stock' : 'Low'}</Status></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="invoice-preview-empty">All inventory items are above their thresholds.</div>}
        </div>

        <div className="panel">
          <SectionHeader eyebrow="Stock mix" title="Categories" />
          <div className="inventory-category-list">
            {Object.entries(categoryCounts).sort(([a], [b]) => a.localeCompare(b)).map(([category, count]) => (
              <div key={category}><span>{category}</span><strong>{count}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Production usage" title="Recent Allocations" />
        {allocations.length ? (
          <div className="table-wrap">
            <table className="allocation-table">
              <thead><tr><th>Date</th><th>Fabric / item</th><th>Quantity</th><th>Order</th><th>Customer</th><th>Tailor</th></tr></thead>
              <tbody>{allocations.slice(0, 10).map((allocation) => (
                <tr key={allocation.id}>
                  <td data-label="Date">{new Date(allocation.createdAt).toLocaleString('en-GB')}</td>
                  <td data-label="Fabric / item"><strong>{allocation.fabricName}</strong></td>
                  <td data-label="Quantity">{toNumber(allocation.quantity)} {allocation.unit}</td>
                  <td data-label="Order">{allocation.invoiceNumber}</td>
                  <td data-label="Customer">{allocation.customerName}</td>
                  <td data-label="Tailor">{allocation.tailorName}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="invoice-preview-empty">No production allocations have been recorded yet.</div>}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Latest records" title="Recently Added Inventory" />
        <div className="inventory-recent-list">
          {[...inventory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map((item) => (
            <article key={item.id}>
              <div><strong>{item.name}</strong><Status>{toNumber(item.quantity) <= toNumber(item.lowStockThreshold) ? 'Low' : 'Healthy'}</Status></div>
              <span>{item.type} · {toNumber(item.quantity)} {item.unit}{item.supplier ? ` · ${item.supplier}` : ''}</span>
              <small>Added {new Date(item.createdAt).toLocaleDateString('en-GB')}</small>
            </article>
          ))}
        </div>
      </section>
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
      invoice.paymentMethod,
      invoice.accountApprovalStatus,
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
  const liveOrders = sentInvoices
    .filter((invoice) => invoice.orderSheet)
    .map((invoice) => ({
      ...productionJobFromInvoice(invoice),
      total: toNumber(invoice.total),
      paymentStatus: invoice.paymentStatus,
      accountApprovalStatus: invoiceApprovalStatus(invoice),
    }))
    .filter(Boolean);

  const updateInvoiceSearch = (value) => {
    setInvoiceSearch(value);
    setInvoicePage(1);
  };

  return (
    <div className="stack">
      <SectionHeader eyebrow="Orders" title="Invoice and Order Sheet Control">
        <span className="live-record-count">{liveOrders.length} live order{liveOrders.length === 1 ? '' : 's'}</span>
      </SectionHeader>
      {liveOrders.length ? (
        <div className="order-cards">
          {liveOrders.map((order) => (
          <article className="order-card" key={order.invoiceNumber}>
            <div>
              <span>{order.invoiceNumber}</span>
              <Status>{order.status}</Status>
            </div>
            <h3>{order.customer}</h3>
            <p>{order.item} · {order.pieces} pieces · {order.store}</p>
            <dl>
              <div><dt>Invoice total</dt><dd>{money.format(order.total)}</dd></div>
              <div><dt>Payment</dt><dd><Status>{order.paymentStatus}</Status></dd></div>
              <div><dt>Delivery</dt><dd>{order.delivery || 'Not set'}</dd></div>
              <div><dt>Tailor</dt><dd>{order.tailor || 'Unassigned'}</dd></div>
              <div><dt>Fabric</dt><dd>{order.fabric || 'Not selected'}</dd></div>
              <div><dt>Style images</dt><dd>{order.images || 0}</dd></div>
            </dl>
            <p className="note">{order.note || 'No production note added.'}</p>
          </article>
          ))}
        </div>
      ) : <div className="invoice-preview-empty">No order sheets have been created yet.</div>}

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
                    <th>Method</th>
                    <th>Accounts</th>
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
                      <td data-label="Method">{invoice.paymentMethod}</td>
                      <td data-label="Accounts"><Status>{invoiceApprovalStatus(invoice)}</Status></td>
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
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/oms/customers')
      .then((response) => setCustomers(response.data?.data?.customers || []))
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load customers.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => [
      customer.fullName,
      customer.phone,
      customer.email,
      customer.category,
      ...(customer.stores || []),
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [customers, search]);

  const totalSpend = customers.reduce((sum, customer) => sum + toNumber(customer.lifetimeSpend), 0);
  const repeatCustomers = customers.filter((customer) => customer.totalOrders > 1).length;
  const withMeasurements = customers.filter((customer) => customer.measurementsAdded).length;

  return (
    <div className="stack customer-workspace">
      <section className="metrics-grid">
        <Stat label="Customers" value={String(customers.length)} detail="Live customer profiles" />
        <Stat label="Returning" value={String(repeatCustomers)} detail="More than one invoice" />
        <Stat label="Measurements" value={String(withMeasurements)} detail="Profiles with measurements" />
        <Stat label="Lifetime invoiced" value={money.format(totalSpend)} detail="Across customer records" tone="gold" />
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Clients" title="Customer Profiles">
          <input className="search" placeholder="Search name, phone, email, or store" value={search} onChange={(event) => setSearch(event.target.value)} />
        </SectionHeader>
        {message ? <div className="invoice-message">{message}</div> : null}
        {loading ? <div className="invoice-preview-empty">Loading customers...</div> : filteredCustomers.length ? (
          <div className="customer-grid">
            {filteredCustomers.map((customer) => (
              <article className="customer-card" key={customer.id}>
                <div className="customer-card-head">
                  <div className="avatar">{customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                  <Status>{customer.category}</Status>
                </div>
                <h3>{customer.fullName}</h3>
                <p>{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                <dl>
                  <div><dt>12-month spend</dt><dd>{money.format(customer.twelveMonthSpend)}</dd></div>
                  <div><dt>Total orders</dt><dd>{customer.totalOrders}</dd></div>
                  <div><dt>Order sheets</dt><dd>{customer.confirmedOrders}</dd></div>
                  <div><dt>Store credit</dt><dd>{money.format(customer.storeCreditBalance)}</dd></div>
                  <div><dt>Measurements</dt><dd>{customer.measurementsAdded ? 'Saved' : 'Not added'}</dd></div>
                  <div><dt>Stores</dt><dd>{customer.stores?.join(', ') || '—'}</dd></div>
                </dl>
                <p className="note">{customer.lastOrderAt ? `Last order ${new Date(customer.lastOrderAt).toLocaleDateString('en-GB')}` : 'No orders yet'}</p>
              </article>
            ))}
          </div>
        ) : <div className="invoice-preview-empty">{customers.length ? 'No customers match your search.' : 'No customer records are available yet.'}</div>}
      </section>
    </div>
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
    paymentMethod: 'transfer',
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
    paymentMethod: form.paymentMethod,
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
        paymentMethod: payload.paymentMethod.charAt(0).toUpperCase() + payload.paymentMethod.slice(1),
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
          <label>Payment method
            <select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)}>
              <option value="transfer">Transfer</option>
              <option value="card">Card</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
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
            <input type="number" min="0" value={form.storeCreditApplied} onChange={(event) => updateForm('storeCreditApplied', event.target.value)} />
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
          <div><dt>Payment method</dt><dd>{form.paymentMethod.charAt(0).toUpperCase() + form.paymentMethod.slice(1)}</dd></div>
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

function PaymentsView({ sentInvoices = [], onApproveInvoice }) {
  const invoiceQueue = sentInvoices;
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const pendingCount = invoiceQueue.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts').length;
  const approvedCount = invoiceQueue.filter(isInvoiceApproved).length;
  const partialCount = invoiceQueue.filter((invoice) => invoice.paymentStatus === 'Partial Paid').length;
  const completedCount = invoiceQueue.filter((invoice) => invoice.paymentStatus === 'Fully Paid').length;
  const filteredQueue = invoiceQueue.filter((invoice) => {
    const approvalMatches = approvalFilter === 'all'
      || (approvalFilter === 'pending' && invoiceApprovalStatus(invoice) === 'Pending Accounts')
      || (approvalFilter === 'approved' && isInvoiceApproved(invoice));
    const paymentMatches = paymentFilter === 'all'
      || (paymentFilter === 'partial' && invoice.paymentStatus === 'Partial Paid')
      || (paymentFilter === 'completed' && invoice.paymentStatus === 'Fully Paid');
    return approvalMatches && paymentMatches;
  });

  return (
    <section className="panel">
      <SectionHeader eyebrow="Accounts" title="Invoice Payment Approval Queue">
        <div className="row-actions">
          <select value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)} aria-label="Filter by approval status">
            <option value="all">All approvals ({invoiceQueue.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="approved">Approved ({approvedCount})</option>
          </select>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} aria-label="Filter by payment status">
            <option value="all">All payments ({invoiceQueue.length})</option>
            <option value="partial">Partial ({partialCount})</option>
            <option value="completed">Completed ({completedCount})</option>
          </select>
        </div>
      </SectionHeader>
      <div className="queue">
        {filteredQueue.length ? filteredQueue.map((invoice) => (
          <article className="queue-row" key={invoice.invoiceNumber}>
            <div>
              <strong>{invoice.customer}</strong>
              <span>{invoice.invoiceNumber} · {invoice.store} · {invoice.paymentStatus}</span>
            </div>
            <strong>{money.format(invoice.total)}</strong>
            <Status>{invoiceApprovalStatus(invoice)}</Status>
            <div className="row-actions">
              <button onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Flagged')}>Flag</button>
              <button
                className="primary-action"
                onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Approved')}
                disabled={isInvoiceApproved(invoice)}
              >
                {isInvoiceApproved(invoice) ? 'Approved' : 'Approve'}
              </button>
            </div>
          </article>
        )) : <div className="invoice-preview-empty">No invoices match the selected filters.</div>}
      </div>
    </section>
  );
}

function OrderSheetView({ sentInvoices = [], onCreateJob }) {
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [sheetForm, setSheetForm] = useState({
    invoiceNumber: '',
    trackingToken: '',
    trackingUrl: '',
    customer: '',
    item: '',
    pieces: 1,
    delivery: todayIso(),
    store: 'Lekki',
    fabric: '',
    fabricId: '',
    fabricUnit: '',
    measurements: '',
    designNotes: '',
    itemNote: '',
    styleImages: ['', '', '', '', ''],
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/oms/fabrics')
      .then((response) => {
        if (!active) return;
        const availableInventory = response.data?.data?.fabrics || [];
        setInventory(availableInventory);
        const firstAvailable = availableInventory.find((fabric) => toNumber(fabric.quantity) > 0);
        if (firstAvailable) {
          setSheetForm((current) => current.fabricId || current.fabric === 'Client supplied' ? current : ({
            ...current,
            fabric: firstAvailable.name,
            fabricId: firstAvailable.id,
            fabricUnit: firstAvailable.unit,
          }));
        }
      })
      .catch(() => setMessage('Unable to load fabrics from inventory.'))
      .finally(() => active && setInventoryLoading(false));
    return () => { active = false; };
  }, []);

  const updateSheetForm = (field, value) => {
    setSheetForm((current) => ({ ...current, [field]: value }));
  };

  const updateStyleImage = (index, value) => {
    setSheetForm((current) => ({
      ...current,
      styleImages: current.styleImages.map((image, imageIndex) => (imageIndex === index ? value : image)),
    }));
  };

  const selectFabric = (fabricId) => {
    if (fabricId === 'client-supplied') {
      setSheetForm((current) => ({ ...current, fabric: 'Client supplied', fabricId: '', fabricUnit: '' }));
      return;
    }
    const selected = inventory.find((fabric) => fabric.id === fabricId);
    setSheetForm((current) => ({
      ...current,
      fabric: selected?.name || '',
      fabricId: selected?.id || '',
      fabricUnit: selected?.unit || '',
    }));
  };

  const selectInvoice = (invoiceNumber) => {
    const invoice = sentInvoices.find((item) => item.invoiceNumber === invoiceNumber);
    if (!invoice) {
      updateSheetForm('invoiceNumber', '');
      return;
    }
    const resolvedToken = invoice.trackingToken || trackingTokenSeed();

    setSheetForm((current) => ({
      ...current,
      invoiceNumber,
      trackingToken: resolvedToken,
      trackingUrl: invoice.trackingUrl || trackingUrlForToken(resolvedToken),
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
    if (!sheetForm.invoiceNumber || !sheetForm.customer.trim() || !sheetForm.item.trim() || !sheetForm.fabric) {
      setMessage('Select an invoice, confirm the customer and item, and choose a fabric before releasing the order sheet.');
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
      status: 'Order Sheet Confirmed',
      requiresAccountApproval: true,
      payment: 'Fully Paid',
      fabric: sheetForm.fabric,
      fabricId: sheetForm.fabricId,
      fabricUnit: sheetForm.fabricUnit,
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

    setMessage('Order sheet saved. It will become visible to Production after Accounts approves the invoice.');
    setSheetForm({
      invoiceNumber: '',
      trackingToken: '',
      trackingUrl: '',
      customer: '',
      item: '',
      pieces: 1,
      delivery: todayIso(),
      store: 'Lekki',
      fabric: '',
      fabricId: '',
      fabricUnit: '',
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
            <select
              value={sheetForm.fabric === 'Client supplied' ? 'client-supplied' : sheetForm.fabricId}
              onChange={(event) => selectFabric(event.target.value)}
              disabled={inventoryLoading}
              required
            >
              <option value="">{inventoryLoading ? 'Loading inventory...' : 'Select inventory fabric'}</option>
              <option value="client-supplied">Client supplied</option>
              {inventory.map((fabric) => (
                <option key={fabric.id} value={fabric.id} disabled={toNumber(fabric.quantity) <= 0}>
                  {fabric.name} ({toNumber(fabric.quantity)} {fabric.unit}){toNumber(fabric.quantity) <= 0 ? ' · Out of stock' : ''}
                </option>
              ))}
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
  const [toast, setToast] = useState('');
  const [inventory, setInventory] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [allocatingJobId, setAllocatingJobId] = useState(null);
  const toastTimerRef = useRef(null);
  const filteredJobs = productionJobs.filter((job) => (
    statusFilter === 'All' ? true : job.status === statusFilter
  ));
  const productionTabs = ['All', 'Order Sheet Confirmed', 'Assigned', 'In Progress', 'Ready'];

  useEffect(() => {
    api.get('/oms/fabrics')
      .then((response) => setInventory(response.data?.data?.fabrics || []))
      .catch(() => notify('Unable to load current inventory'));
    api.get('/oms/staff')
      .then((response) => setTailors((response.data?.data?.staffUsers || []).filter((person) => person.role === 'tailor')))
      .catch(() => notify('Unable to load tailors'));
  }, []);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2600);
  };

  const updateJobWithToast = (job, changes, message) => {
    onUpdateJob(job.id, changes);
    notify(message);
  };

  const allocateFabric = async (order) => {
    if (order.fabric === 'Client supplied') {
      updateJobWithToast(order, { fabricConfirmed: true, fabricAllocated: true }, 'Client-supplied fabric confirmed');
      return;
    }
    const selectedFabric = inventory.find((fabric) => fabric.id === order.fabricId)
      || inventory.find((fabric) => fabric.name === order.fabric);
    const usage = Number(order.fabricUsage);
    if (!selectedFabric || !Number.isFinite(usage) || usage <= 0) {
      notify('Select inventory fabric and enter the quantity used');
      return;
    }
    if (!order.tailor || order.tailor === 'Unassigned') {
      notify('Assign a tailor before allocating fabric');
      return;
    }
    if (!order.trackingToken) {
      notify('This job has no saved order sheet and cannot allocate stock');
      return;
    }

    setAllocatingJobId(order.id);
    try {
      const response = await api.post('/oms/fabrics/allocate', {
        fabricId: selectedFabric.id,
        quantity: usage,
        trackingToken: order.trackingToken,
        tailorName: order.tailor,
      });
      const updatedFabric = response.data?.data?.fabric;
      setInventory((current) => current.map((fabric) => fabric.id === updatedFabric.id ? updatedFabric : fabric));
      onUpdateJob(order.id, {
        fabricConfirmed: true,
        fabricAllocated: true,
        fabricId: selectedFabric.id,
        fabricUnit: selectedFabric.unit,
      });
      notify(`${usage} ${selectedFabric.unit} allocated to ${order.invoiceNumber}`);
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to allocate fabric');
    } finally {
      setAllocatingJobId(null);
    }
  };

  return (
    <div className="production-board">
      {toast ? <div className="app-toast">{toast}</div> : null}
      <section className="panel span-2 production-jobs-panel">
        <SectionHeader eyebrow="Production" title="Active Job Sheets">
          <button>View all jobs</button>
        </SectionHeader>
        <div className="production-tabs">
          {productionTabs.map((tab) => (
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
          {filteredJobs.length ? filteredJobs.map((order) => (
            <article className="job-card" key={order.id}>
              <div className="job-line production-job-head">
                <div className="avatar">{order.customer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div>
                  <strong>{order.customer}</strong>
                  <span className="production-order-name">{order.item}</span>
                  <span>{order.delivery}</span>
                </div>
                <Status>{order.status}</Status>
              </div>
              <div className="job-detail">
                <dl>
                  <div><dt>Fabric</dt><dd>{order.fabric} · <span className='text-green-600'>{order.fabricConfirmed ? 'Confirmed' : 'Not confirmed'}</span></dd></div>
                  <div><dt>Tailor</dt><dd>{order.tailor}</dd></div>
                  <div><dt>Images</dt><dd>{order.images || 0} labelled references</dd></div>
                  <div><dt>Measurements</dt><dd>{order.measurements ? 'Included' : 'Not added'}</dd></div>
                </dl>
                <div className="production-controls">
                  <label>Tailor
                    <select value={order.tailor} onChange={(event) => updateJobWithToast(order, {
                      tailor: event.target.value,
                      status: event.target.value === 'Unassigned' ? 'Order Sheet Confirmed' : 'Assigned',
                    }, event.target.value === 'Unassigned' ? 'Tailor assignment removed' : `Assigned to ${event.target.value}`)}>
                      <option>Unassigned</option>
                      {tailors.map((tailor) => <option key={tailor.id}>{tailor.displayName}</option>)}
                    </select>
                  </label>
                  <label>Fabric
                    <select disabled={order.fabricAllocated} value={order.fabric === 'Client supplied' ? 'client-supplied' : order.fabricId || ''} onChange={(event) => {
                      const selected = inventory.find((fabric) => fabric.id === event.target.value);
                      const clientSupplied = event.target.value === 'client-supplied';
                      const fabricName = clientSupplied ? 'Client supplied' : selected?.name || '';
                      updateJobWithToast(order, {
                        fabric: fabricName,
                        fabricId: selected?.id || '',
                        fabricUnit: selected?.unit || '',
                        fabricConfirmed: false,
                      }, `Fabric changed to ${fabricName}`);
                    }}>
                      <option value="">Select inventory fabric</option>
                      <option value="client-supplied">Client supplied</option>
                      {inventory.map((fabric) => (
                        <option key={fabric.id} value={fabric.id} disabled={toNumber(fabric.quantity) <= 0}>
                          {fabric.name} ({toNumber(fabric.quantity)} {fabric.unit}){toNumber(fabric.quantity) <= 0 ? ' · Out of stock' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>Quantity used
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={order.fabricUsage || ''}
                      disabled={order.fabricAllocated || order.fabric === 'Client supplied'}
                      onChange={(event) => onUpdateJob(order.id, { fabricUsage: event.target.value, fabricConfirmed: false })}
                      placeholder="Amount used"
                    />
                  </label>
                  <label className="wide-field">Production style note
                    <textarea value={order.productionNote || ''} onChange={(event) => onUpdateJob(order.id, { productionNote: event.target.value })} placeholder="Production Manager instruction for Tailor" />
                  </label>
                </div>
                <p className="note">{order.designNotes || order.note}</p>
                <div className="row-actions">
                  <button disabled={order.fabricAllocated || allocatingJobId === order.id} onClick={() => allocateFabric(order)}>
                    {order.fabricAllocated ? 'Fabric Allocated' : allocatingJobId === order.id ? 'Allocating...' : 'Allocate Fabric'}
                  </button>
                  <button
                    disabled={order.status === 'In Progress' || order.status === 'Ready'}
                    onClick={() => updateJobWithToast(order, { status: 'In Progress' }, 'Job moved to In Progress')}
                  >
                    In Progress
                  </button>
                  <button className="primary-action" onClick={() => updateJobWithToast(order, { status: 'Ready' }, 'Job marked Ready')}>Mark Ready</button>
                </div>
              </div>
            </article>
          )) : (
            <div className="invoice-preview-empty">
              No approved job sheets are visible yet. Accounts must approve the invoice before Production can see the order sheet.
            </div>
          )}
        </div>
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Tailors" title="Availability" />
        <div className="mini-list">
          {tailors.map((tailor) => (
            <span key={tailor.id}>{tailor.displayName} · {tailor.tailorDepartment || 'Department not set'} · Grade {tailor.tailorGrade || 'Not graded'}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function InventoryView() {
  const emptyForm = { name: '', type: '', quantity: '', unit: 'm', supplier: '', lowStockThreshold: '' };
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadInventory = () => {
    setLoading(true);
    Promise.all([api.get('/oms/fabrics'), api.get('/oms/fabrics/allocations')])
      .then(([inventoryResponse, allocationResponse]) => {
        setInventory(inventoryResponse.data?.data?.fabrics || []);
        setAllocations(allocationResponse.data?.data?.allocations || []);
      })
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load inventory.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInventory(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setMessage('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveInventory = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.type.trim() || !form.unit.trim()) {
      setMessage('Item name, category, and unit are required.');
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      type: form.type.trim(),
      unit: form.unit.trim(),
      supplier: form.supplier.trim(),
      quantity: toNumber(form.quantity),
      lowStockThreshold: toNumber(form.lowStockThreshold),
    };

    setSaving(true);
    setMessage('');
    try {
      const response = await api.post('/oms/fabrics', payload);
      const saved = response.data?.data?.fabric;
      setInventory((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      closeForm();
      setMessage('Inventory item created and Accounts notified.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || 'Unable to save inventory item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack inventory-workspace">
      <section className="panel">
        <SectionHeader eyebrow="Inventory" title="Fabric Ledger">
          <button type="button" className="primary-action" onClick={openCreate}>Add inventory item</button>
        </SectionHeader>

        {message ? <div className="invoice-message" role="status">{message}</div> : null}

        {formOpen ? (
          <form className="inventory-form" onSubmit={saveInventory}>
            <div className="inventory-form-head">
              <div><span>New stock record</span><h3>Add inventory item</h3></div>
              <button type="button" onClick={closeForm}>Cancel</button>
            </div>
            <div className="invoice-form-grid">
              <label>Item name<input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="e.g. Black jacquard wool" required /></label>
              <label>Category / type
                <select value={form.type} onChange={(event) => updateForm('type', event.target.value)} required>
                  <option value="">Select a category</option>
                  {inventoryCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>Quantity<input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} required /></label>
              <label>Unit<input value={form.unit} onChange={(event) => updateForm('unit', event.target.value)} placeholder="m, rolls, pieces" required /></label>
              <label>Supplier<input value={form.supplier} onChange={(event) => updateForm('supplier', event.target.value)} placeholder="Supplier name (optional)" /></label>
              <label>Low-stock threshold<input type="number" min="0" step="0.01" value={form.lowStockThreshold} onChange={(event) => updateForm('lowStockThreshold', event.target.value)} required /></label>
            </div>
            <button className="primary-action inventory-save" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create item'}</button>
          </form>
        ) : null}

        {loading ? <div className="invoice-preview-empty">Loading inventory...</div> : inventory.length ? (
          <div className="fabric-grid">
            {inventory.map((fabric) => {
              const quantity = toNumber(fabric.quantity);
              const threshold = toNumber(fabric.lowStockThreshold);
              const status = quantity <= threshold ? 'Low' : 'Healthy';
              return (
                <article className="fabric-card" key={fabric.id}>
                  <div><h3>{fabric.name}</h3><Status>{status}</Status></div>
                  <p>{fabric.type}{fabric.supplier ? ` · ${fabric.supplier}` : ''}</p>
                  <strong>{quantity.toLocaleString()} {fabric.unit}</strong>
                  <small>Low stock threshold: {threshold.toLocaleString()} {fabric.unit}</small>
                  <div className="inventory-locked-note">Read only · Stock changes through Production allocation</div>
                </article>
              );
            })}
          </div>
        ) : <div className="invoice-preview-empty">No inventory items yet. Add your first stock record.</div>}
      </section>
      <section className="panel">
        <SectionHeader eyebrow="Audit trail" title="Usage & Allocation Log" />
        {allocations.length ? (
          <div className="table-wrap">
            <table className="allocation-table">
              <thead><tr><th>Date</th><th>Fabric / item</th><th>Quantity</th><th>Order</th><th>Customer</th><th>Tailor</th></tr></thead>
              <tbody>{allocations.map((allocation) => (
                <tr key={allocation.id}>
                  <td data-label="Date">{new Date(allocation.createdAt).toLocaleString('en-GB')}</td>
                  <td data-label="Fabric / item"><strong>{allocation.fabricName}</strong></td>
                  <td data-label="Quantity">{toNumber(allocation.quantity)} {allocation.unit}</td>
                  <td data-label="Order">{allocation.invoiceNumber}</td>
                  <td data-label="Customer">{allocation.customerName}</td>
                  <td data-label="Tailor">{allocation.tailorName}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="invoice-preview-empty">Production allocations will appear here.</div>}
      </section>
    </div>
  );
}

function StaffView({ role, currentRole }) {
  const emptyForm = { displayName: '', phone: '', pin: '', role: 'store_manager', store: 'all', status: 'active', dateOfBirth: '', tailorDepartment: '', tailorGrade: '' };
  const [staffUsers, setStaffUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/oms/staff')
      .then((response) => setStaffUsers(response.data?.data?.staffUsers || []))
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load staff.'));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setFormOpen(true);
  };

  const openEdit = (person) => {
    setEditingId(person.id);
    setForm({
      displayName: person.displayName || '',
      phone: person.phone || '',
      pin: '',
      role: person.role,
      store: person.store,
      status: person.status,
      dateOfBirth: person.dateOfBirth || '',
      tailorDepartment: person.tailorDepartment || '',
      tailorGrade: person.tailorGrade || '',
    });
    setMessage('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveStaff = async (event) => {
    event.preventDefault();
    if (form.role === 'tailor' && !form.tailorDepartment) {
      setMessage('Select a department for the tailor.');
      return;
    }
    if (!editingId && !form.pin) {
      setMessage('A login PIN is required for a new staff account.');
      return;
    }
    setSaving(true);
    setMessage('');
    const payload = {
      ...form,
      tailorDepartment: form.role === 'tailor' ? form.tailorDepartment : null,
      tailorGrade: form.role === 'tailor' && form.tailorGrade ? Number(form.tailorGrade) : null,
      ownerPhone: currentRole.phone,
      ownerPin: currentRole.pin,
    };
    if (editingId && !payload.pin) delete payload.pin;
    try {
      const response = editingId
        ? await api.patch(`/oms/staff/${editingId}`, payload)
        : await api.post('/oms/staff', payload);
      const saved = response.data?.data?.staffUser;
      setStaffUsers((current) => editingId
        ? current.map((person) => person.id === editingId ? { ...person, ...saved } : person)
        : [saved, ...current]);
      closeForm();
      setMessage(editingId ? 'Staff account updated.' : 'Staff account created.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save staff account.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (person) => {
    if (!window.confirm(`Delete ${person.displayName}'s staff account? This cannot be undone.`)) return;
    setMessage('');
    try {
      await api.delete(`/oms/staff/${person.id}`, { data: { ownerPhone: currentRole.phone, ownerPin: currentRole.pin } });
      setStaffUsers((current) => current.filter((item) => item.id !== person.id));
      if (editingId === person.id) closeForm();
      setMessage('Staff account deleted.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to delete staff account.');
    }
  };

  const updateTailorGrade = async (tailor, grade) => {
    setMessage('');
    try {
      const response = await api.patch(`/oms/staff/${tailor.id}/tailor-grade`, {
        grade,
        ownerPhone: currentRole.phone,
        ownerPin: currentRole.pin,
      });
      const updated = response.data?.data?.staffUser;
      setStaffUsers((current) => current.map((person) => person.id === tailor.id
        ? { ...person, tailorGrade: updated.tailorGrade }
        : person));
      setMessage(`${tailor.displayName}'s grade was updated.`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update tailor grade.');
    }
  };

  return (
    <section className="panel">
      <SectionHeader eyebrow="Owner Control" title="Staff Management">
        {role === 'owner' ? <button type="button" className="primary-action" onClick={openCreate}>Add Staff</button> : null}
      </SectionHeader>
      {message ? <div className="invoice-message" role="status">{message}</div> : null}
      {role === 'owner' && formOpen ? (
        <form className="inventory-form" onSubmit={saveStaff}>
          <div className="inventory-form-head">
            <div><span>{editingId ? 'Update employee' : 'New employee'}</span><h3>{editingId ? 'Edit Staff Account' : 'Create Staff Account'}</h3></div>
            <button type="button" onClick={closeForm}>Cancel</button>
          </div>
          <div className="invoice-form-grid">
            <label>Full name<input value={form.displayName} onChange={(event) => updateForm('displayName', event.target.value)} required /></label>
            <label>Phone number<input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} required /></label>
            <label>{editingId ? 'New PIN (optional)' : 'Login PIN'}<input type="password" value={form.pin} onChange={(event) => updateForm('pin', event.target.value)} required={!editingId} /></label>
            <label>Role<select value={form.role} onChange={(event) => updateForm('role', event.target.value)}>{roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>Store<select value={form.store} onChange={(event) => updateForm('store', event.target.value)}><option value="all">All stores</option><option value="ikeja">Ikeja</option><option value="lekki">Lekki</option><option value="production">Production</option></select></label>
            <label>Status<select value={form.status} onChange={(event) => updateForm('status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="deactivated">Deactivated</option></select></label>
            <label>Date of birth<input type="date" value={form.dateOfBirth} onChange={(event) => updateForm('dateOfBirth', event.target.value)} /></label>
            {form.role === 'tailor' ? <>
              <label>Tailor department<select value={form.tailorDepartment} onChange={(event) => updateForm('tailorDepartment', event.target.value)} required><option value="">Select department</option><option value="native">Native</option><option value="suit">Suits</option><option value="trouser">Trouser</option><option value="finishing">Finishing</option></select></label>
              <label>Initial grade<select value={form.tailorGrade} onChange={(event) => updateForm('tailorGrade', event.target.value)}><option value="">Not graded</option>{[1, 2, 3, 4, 5].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}</select></label>
            </> : null}
          </div>
          <button className="primary-action inventory-save" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create account'}</button>
        </form>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Store</th><th>Status</th><th>Last login</th><th>Tailor department</th><th>Grade</th>{role === 'owner' ? <th>Actions</th> : null}</tr></thead>
          <tbody>{staffUsers.map((person) => (
            <tr key={person.id}>
              <td data-label="Name"><strong>{person.displayName}</strong></td>
              <td data-label="Role">{person.role.replaceAll('_', ' ')}</td>
              <td data-label="Store">{person.store}</td>
              <td data-label="Status"><Status>{person.status}</Status></td>
              <td data-label="Last login">{person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleString('en-GB') : 'Never'}</td>
              <td data-label="Tailor department">{person.role === 'tailor' ? person.tailorDepartment || 'Not set' : '—'}</td>
              <td data-label="Grade">{person.role === 'tailor' ? (
                role === 'owner' ? (
                  <select value={person.tailorGrade || ''} onChange={(event) => updateTailorGrade(person, event.target.value)} aria-label={`Grade for ${person.displayName}`}>
                    <option value="" disabled>Not graded</option>
                    {[1, 2, 3, 4, 5].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
                  </select>
                ) : person.tailorGrade ? `Grade ${person.tailorGrade}` : 'Not graded'
              ) : '—'}</td>
              {role === 'owner' ? <td data-label="Actions"><div className="row-actions"><button type="button" onClick={() => openEdit(person)}>Edit</button><button type="button" className="danger-action" onClick={() => deleteStaff(person)}>Delete</button></div></td> : null}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function ReportsView() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');

  const loadReport = () => {
    setLoading(true);
    setMessage('');
    api.get('/oms/reports/end-of-period', { params: { from, to } })
      .then((response) => setReport(response.data?.data?.report || null))
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load report.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReport(); }, [from, to]);

  const downloadCsv = () => {
    const rows = [
      ['End-of-Period Report', `${from} to ${to}`],
      [],
      ['Metric', 'Value'],
      ...Object.entries(report.summary).map(([key, value]) => [key, value]),
      [],
      ['Invoice', 'Date', 'Customer', 'Store', 'Total', 'Payment', 'Approval', 'Order Status'],
      ...report.invoices.map((invoice) => [invoice.invoiceNumber, invoice.date, invoice.customer, invoice.store, invoice.total, invoice.paymentStatus, invoice.approvalStatus, invoice.orderStatus]),
      [],
      ['Allocation Date', 'Fabric', 'Quantity', 'Unit', 'Invoice', 'Customer', 'Tailor'],
      ...report.allocations.map((allocation) => [allocation.date, allocation.fabricName, allocation.quantity, allocation.unit, allocation.invoiceNumber, allocation.customerName, allocation.tailorName]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `twif-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) {
      setMessage('Allow popups to export the PDF report.');
      return;
    }
    const summaryRows = Object.entries(report.summary).map(([key, value]) => `<tr><td>${escape(key.replace(/([A-Z])/g, ' $1'))}</td><td>${escape(value)}</td></tr>`).join('');
    const storeRows = report.storeBreakdown.map((store) => `<tr><td>${escape(store.store)}</td><td>${escape(store.invoices)}</td><td>${escape(money.format(store.total))}</td></tr>`).join('');
    const invoiceRows = report.invoices.map((invoice) => `<tr><td>${escape(invoice.invoiceNumber)}</td><td>${escape(new Date(invoice.date).toLocaleDateString('en-GB'))}</td><td>${escape(invoice.customer)}</td><td>${escape(invoice.store)}</td><td>${escape(money.format(invoice.total))}</td><td>${escape(invoice.paymentStatus)}</td><td>${escape(invoice.orderStatus)}</td></tr>`).join('');
    const allocationRows = report.allocations.map((allocation) => `<tr><td>${escape(new Date(allocation.date).toLocaleDateString('en-GB'))}</td><td>${escape(allocation.fabricName)}</td><td>${escape(`${allocation.quantity} ${allocation.unit}`)}</td><td>${escape(allocation.invoiceNumber)}</td><td>${escape(allocation.customerName)}</td><td>${escape(allocation.tailorName)}</td></tr>`).join('');
    popup.document.write(`<!doctype html><html><head><title>TWIF End-of-Period Report</title><style>body{font-family:Arial,sans-serif;color:#171717;padding:32px}h1{margin-bottom:4px}p{color:#666}table{width:100%;border-collapse:collapse;margin:22px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#171717;color:#fff}@media print{body{padding:0}}</style></head><body><h1>TWIF End-of-Period Report</h1><p>${escape(from)} to ${escape(to)}</p><h2>Summary</h2><table><tbody>${summaryRows}</tbody></table><h2>Store Performance</h2><table><thead><tr><th>Store</th><th>Invoices</th><th>Total Invoiced</th></tr></thead><tbody>${storeRows}</tbody></table><h2>Invoices and Orders</h2><table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Store</th><th>Total</th><th>Payment</th><th>Order</th></tr></thead><tbody>${invoiceRows}</tbody></table><h2>Inventory Allocations</h2><table><thead><tr><th>Date</th><th>Fabric</th><th>Quantity</th><th>Order</th><th>Customer</th><th>Tailor</th></tr></thead><tbody>${allocationRows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };

  const exportReport = () => {
    if (!report) return;
    if (exportFormat === 'pdf') printPdf();
    else downloadCsv();
  };

  if (loading && !report) return <section className="panel"><div className="invoice-preview-empty">Loading report...</div></section>;

  return (
    <div className="stack">
      <section className="panel">
        <SectionHeader eyebrow="Exports" title="End-of-Period Reports">
          <div className="row-actions">
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)} aria-label="Export format"><option value="csv">CSV</option><option value="pdf">PDF</option></select>
            <button type="button" className="primary-action" onClick={exportReport} disabled={!report}>Export</button>
          </div>
        </SectionHeader>
        <div className="invoice-form-grid">
          <label>From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>To<input type="date" value={to} min={from} max={todayIso()} onChange={(event) => setTo(event.target.value)} /></label>
        </div>
        {message ? <div className="invoice-message" role="status">{message}</div> : null}
      </section>

      {report ? <>
        <section className="metrics-grid">
          <Stat label="Total invoiced" value={money.format(report.summary.totalInvoiced)} detail={`${report.summary.invoiceCount} invoices`} tone="gold" />
          <Stat label="Customers" value={String(report.summary.customerCount)} detail="Unique customers in period" />
          <Stat label="Active orders" value={String(report.summary.activeOrderCount)} detail={`${report.summary.readyOrderCount} ready`} />
          <Stat label="Pending approval" value={String(report.summary.pendingApprovalCount)} detail={`${report.summary.approvedCount} approved`} tone={report.summary.pendingApprovalCount ? 'alert' : undefined} />
        </section>
        <section className="metrics-grid">
          <Stat label="Fully paid" value={String(report.summary.fullyPaidCount)} detail={`${report.summary.partiallyPaidCount} partially paid`} />
          <Stat label="Allocations" value={String(report.summary.allocationCount)} detail="Production material usage" />
          <Stat label="Low stock" value={String(report.summary.lowStockCount)} detail={`${report.summary.inventoryItemCount} inventory items`} tone={report.summary.lowStockCount ? 'alert' : undefined} />
          <Stat label="Active staff" value={String(report.summary.activeStaffCount)} detail={`${report.summary.staffAddedCount} added in period`} />
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Stores" title="Store Performance" />
          <div className="table-wrap"><table><thead><tr><th>Store</th><th>Invoices</th><th>Total invoiced</th></tr></thead><tbody>{report.storeBreakdown.map((store) => <tr key={store.store}><td>{store.store}</td><td>{store.invoices}</td><td>{money.format(store.total)}</td></tr>)}</tbody></table></div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Commercial activity" title="Invoices and Orders" />
          {report.invoices.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Store</th><th>Total</th><th>Payment</th><th>Approval</th><th>Order</th></tr></thead><tbody>{report.invoices.map((invoice) => <tr key={invoice.invoiceNumber}><td>{new Date(invoice.date).toLocaleDateString('en-GB')}</td><td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customer}</td><td>{invoice.store}</td><td>{money.format(invoice.total)}</td><td><Status>{invoice.paymentStatus}</Status></td><td><Status>{invoice.approvalStatus}</Status></td><td><Status>{invoice.orderStatus}</Status></td></tr>)}</tbody></table></div> : <div className="invoice-preview-empty">No invoices in this period.</div>}
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Production usage" title="Inventory Allocations" />
          {report.allocations.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Fabric</th><th>Quantity</th><th>Order</th><th>Customer</th><th>Tailor</th></tr></thead><tbody>{report.allocations.map((allocation, index) => <tr key={`${allocation.invoiceNumber}-${allocation.date}-${index}`}><td>{new Date(allocation.date).toLocaleDateString('en-GB')}</td><td>{allocation.fabricName}</td><td>{allocation.quantity} {allocation.unit}</td><td>{allocation.invoiceNumber}</td><td>{allocation.customerName}</td><td>{allocation.tailorName}</td></tr>)}</tbody></table></div> : <div className="invoice-preview-empty">No inventory allocations in this period.</div>}
        </section>
      </> : null}
    </div>
  );
}

function TailorTasks({ compact = false, currentRole, productionJobs = [], onUpdateJob }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const assignedJobs = productionJobs.filter((order) => order.tailor === tailorName);

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

function WeeklyLogView({ currentRole, productionJobs = [] }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const assignedJobs = productionJobs.filter((order) => order.tailor === tailorName);

  return (
    <section className="panel">
      <SectionHeader eyebrow="Log Sheet" title="Weekly and Monthly Aggregation" />
      <OrderTableLike
        columns={['Task', 'Date assigned', 'Status', 'Logged at']}
        rows={assignedJobs.map((order) => [
          order.item,
          order.assignedAt || 'Today',
          order.status === 'Ready' ? 'Ready' : 'In Progress',
          order.status === 'Ready' ? 'Marked ready' : 'Active',
        ])}
      />
    </section>
  );
}

function NotificationPanel({ role, currentRole }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const displayName = currentRole?.name?.split(' (')[0] || '';

  useEffect(() => {
    api.get('/oms/notifications', { params: { role, name: displayName } })
      .then((response) => setItems(response.data?.data?.notifications || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [role, displayName]);

  const markAllRead = async () => {
    await api.patch('/oms/notifications/read-all', { role, name: displayName });
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    window.dispatchEvent(new Event('oms-notifications-read'));
  };

  return (
    <section className="panel">
      <SectionHeader eyebrow="Inbox" title="Notifications">
        {items.some((item) => !item.isRead) ? <button type="button" onClick={markAllRead}>Mark all read</button> : null}
      </SectionHeader>
      <div className="notification-list">
        {loading ? <div className="invoice-preview-empty">Loading notifications...</div> : items.length ? items.map((item) => (
          <article className={item.isRead ? 'notification-read' : 'notification-unread'} key={item.id}>
            <span>{item.channel}</span>
            <p>{item.message}</p>
            <small>{new Date(item.createdAt).toLocaleString('en-GB')}</small>
          </article>
        )) : <div className="invoice-preview-empty">No notifications for this account yet.</div>}
      </div>
    </section>
  );
}

function NotificationBell({ role, currentRole, onOpen }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const displayName = currentRole?.name?.split(' (')[0] || '';

  useEffect(() => {
    let cancelled = false;
    const loadUnread = () => {
      api.get('/oms/notifications', { params: { role, name: displayName } })
        .then((response) => {
          if (!cancelled) setUnreadCount(response.data?.data?.unreadCount || 0);
        })
        .catch(() => {});
    };
    loadUnread();
    const intervalId = window.setInterval(loadUnread, 20000);
    window.addEventListener('oms-notifications-read', loadUnread);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('oms-notifications-read', loadUnread);
    };
  }, [role, displayName]);

  return (
    <button type="button" className="notification-bell" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} onClick={onOpen}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
      {unreadCount ? <span>{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
    </button>
  );
}

function ProfilePhotoControl({ account, onProfileImageChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const initials = (account?.name || account?.label || 'Staff')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Profile photos must be 5 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('pin', account.pin);
    setUploading(true);
    setMessage('');
    try {
      const response = await api.post(`/oms/staff/${encodeURIComponent(account.phone)}/profile-image`, formData);
      onProfileImageChange(response.data?.data?.profileImageUrl || '');
      setMessage('Profile photo updated.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-photo-control">
      <input ref={inputRef} type="file" accept="image/*" onChange={uploadImage} hidden />
      <button type="button" className="profile-photo-button" disabled={uploading} onClick={() => inputRef.current?.click()} aria-label="Upload profile photo">
        {account.profileImageUrl ? <img src={account.profileImageUrl} alt="" /> : <span>{initials}</span>}
        {uploading ? <i>...</i> : null}
      </button>
      {message ? <div className="profile-photo-message" role="status">{message}</div> : null}
    </div>
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

    const loadTracking = () => {
      api.get(`/oms/track/${encodeURIComponent(token)}`)
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
              status: customerStatus(job.status),
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
              status: 'In Progress',
              styleImagesCount: 0,
            } : null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    loadTracking();
    const intervalId = window.setInterval(loadTracking, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, productionJobs, sentInvoices]);

  const normalizedStatus = customerStatus(tracking?.status);
  const steps = ['In Progress', 'Ready for Collection'];
  const currentStep = Math.max(0, steps.indexOf(normalizedStatus));
  const closeTrackingPage = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close();
  };

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
            <div className={classNames('tracking-step', index === currentStep && 'active')} key={step}>
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

        <div className="tracking-actions">
          <button type="button" className="tracking-close" onClick={closeTrackingPage}>Close</button>
          <a className="tracking-profile-link" href={`/c/${encodeURIComponent(token)}/profile`}>Go to profile</a>
        </div>
      </section>
    </main>
  );
}

function CustomerPortalPage({ token, sentInvoices = [] }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/oms/track/${encodeURIComponent(token)}/profile`)
      .then((response) => {
        if (!cancelled) setProfile(response.data?.data?.profile || null);
      })
      .catch(() => {
        const source = sentInvoices.find((invoice) => invoice.trackingToken === token);
        if (!cancelled && source) {
          const invoices = sentInvoices.filter((invoice) => invoice.customer === source.customer);
          setProfile({
            name: source.customer,
            phone: '',
            email: '',
            totalOrders: invoices.length,
            totalSpend: invoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
            invoices: invoices.map((invoice) => ({
              ...invoice,
              invoiceDate: invoice.createdAt,
              balanceDue: 0,
              items: [{ description: invoice.item || 'Custom order', quantity: invoice.pieces || 1 }],
            })),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, sentInvoices]);

  if (loading || !profile) {
    return (
      <main className="tracking-page">
        <section className="tracking-card">
          <div className="brand-lockup tracking-brand"><div className="mark">TW</div><strong>TWIF</strong></div>
          <h1>{loading ? 'Loading your profile...' : 'Customer Profile Not Found'}</h1>
          {!loading && <a className="tracking-profile-link portal-back-link" href={`/c/${encodeURIComponent(token)}`}>Back to tracking</a>}
        </section>
      </main>
    );
  }

  return (
    <main className="tracking-page customer-portal-page">
      <section className="tracking-card customer-portal-card">
        <div className="tracking-top">
          <div className="brand-lockup tracking-brand"><div className="mark">TW</div><div><strong>TWIF</strong><span>Customer profile</span></div></div>
          <a className="portal-back" href={`/c/${encodeURIComponent(token)}`}>Back to tracking</a>
        </div>

        <div className="portal-profile-head">
          <div className="avatar">{profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
          <div><span>Your profile</span><h1>{profile.name}</h1><p>{[profile.phone, profile.email].filter(Boolean).join(' · ')}</p></div>
        </div>

        <dl className="portal-summary">
          <div><dt>Orders</dt><dd>{profile.totalOrders}</dd></div>
          <div><dt>Total invoiced</dt><dd>{money.format(profile.totalSpend)}</dd></div>
        </dl>

        <section className="portal-history">
          <h2>Orders & invoices</h2>
          {profile.invoices.length ? profile.invoices.map((invoice) => (
            <article key={invoice.invoiceNumber}>
              <div className="portal-invoice-head">
                <div><span>{invoice.invoiceNumber}</span><strong>{invoice.items.map((item) => item.description).join(', ')}</strong></div>
                <Status>{invoice.orderStatus}</Status>
              </div>
              <dl>
                <div><dt>Date</dt><dd>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB') : '—'}</dd></div>
                <div><dt>Store</dt><dd>{invoice.store}</dd></div>
                <div><dt>Invoice total</dt><dd>{money.format(invoice.total)}</dd></div>
                <div><dt>Payment</dt><dd>{invoice.paymentStatus}</dd></div>
              </dl>
            </article>
          )) : <p className="tracking-note">No invoices are available yet.</p>}
        </section>

        <p className="portal-magic-note">This secure link is your access to TWIF. No password or login is required, so keep it private.</p>
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
  if (activeView === 'Overview') return <Overview role={role} currentRole={viewProps.currentRole} sentInvoices={viewProps.sentInvoices} productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Orders') return <OrdersView sentInvoices={viewProps.sentInvoices} />;
  if (activeView === 'Customers') return <CustomersView />;
  if (activeView === 'New Invoice') return <NewInvoiceView currentRole={viewProps.currentRole} onInvoiceSent={viewProps.onInvoiceSent} />;
  if (activeView === 'Order Sheet') return <OrderSheetView sentInvoices={viewProps.sentInvoices} onCreateJob={viewProps.onCreateJob} />;
  if (activeView === 'Payments') return <PaymentsView sentInvoices={viewProps.sentInvoices} onApproveInvoice={viewProps.onApproveInvoice} />;
  if (activeView === 'Production') return <ProductionView productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Inventory') return <InventoryView />;
  if (activeView === 'Staff') return <StaffView role={role} currentRole={viewProps.currentRole} />;
  if (activeView === 'Reports') return <ReportsView />;
  if (activeView === 'My Tasks') return <TailorTasks currentRole={viewProps.currentRole} productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Weekly Log') return <WeeklyLogView currentRole={viewProps.currentRole} productionJobs={viewProps.productionJobs} />;
  if (activeView === 'Notifications') return <NotificationPanel role={role} currentRole={viewProps.currentRole} />;
  return <Overview role={role} />;
}

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState(null);
  const visibleNav = navByRole[role];
  const [activeView, setActiveView] = useState('Overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sentInvoices, setSentInvoices] = useState([]);
  const [productionJobs, setProductionJobs] = useState([]);
  const [signedInAccount, setSignedInAccount] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);

  const currentRole = useMemo(() => {
    const roleDetails = roles.find((item) => item.id === role);
    if (!roleDetails) return null;
    return {
      ...roleDetails,
      ...signedInAccount,
      name: staffProfile?.displayName || roleDetails.name,
      profileImageUrl: staffProfile?.profileImageUrl || '',
    };
  }, [role, signedInAccount, staffProfile]);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;

    api.get('/oms/invoices/sent')
      .then((response) => {
        if (cancelled) return;
        const invoices = response.data?.data?.invoices || [];
        setSentInvoices(invoices);
        setProductionJobs(invoices.map(productionJobFromInvoice).filter(Boolean));
      })
      .catch(() => {
        // Keep the local cache visible if the API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !signedInAccount?.phone) return;
    api.get('/oms/staff')
      .then((response) => {
        const phone = signedInAccount.phone.replace(/\D/g, '');
        const profile = (response.data?.data?.staffUsers || []).find((item) => item.phone.replace(/\D/g, '') === phone);
        if (profile) setStaffProfile(profile);
      })
      .catch(() => {});
  }, [signedIn, signedInAccount]);

  const recordSentInvoice = (invoice) => {
    setSentInvoices((current) => [
      { ...invoice, accountApprovalStatus: invoice.accountApprovalStatus || 'Pending Accounts' },
      ...current.filter((item) => item.invoiceNumber !== invoice.invoiceNumber),
    ]);
  };

  const updateInvoiceApproval = (invoiceNumber, status) => {
    setSentInvoices((current) => current.map((invoice) => (
      invoice.invoiceNumber === invoiceNumber ? { ...invoice, accountApprovalStatus: status } : invoice
    )));

    api.patch(`/oms/invoices/${invoiceNumber}/account-approval`, { status }).then((response) => {
      const invoice = response.data?.data?.invoice;
      if (!invoice) return;
      setSentInvoices((current) => current.map((item) => (
        item.invoiceNumber === invoice.invoiceNumber ? invoice : item
      )));
      setProductionJobs((current) => mergeJobsByInvoice(current, [productionJobFromInvoice(invoice)]));
    }).catch(() => {});
  };

  const createProductionJob = (job) => {
    setProductionJobs((current) => [job, ...current]);
  };

  const updateProductionJob = (jobId, changes) => {
    const existingJob = productionJobs.find((job) => job.id === jobId);
    const updatedJob = existingJob ? {
      ...existingJob,
      ...changes,
      updatedAt: new Date().toISOString(),
    } : null;

    setProductionJobs((current) => current.map((job) => (
      job.id === jobId ? updatedJob : job
    )));

    if (updatedJob?.trackingToken) {
      api.patch(`/oms/tracking/order-sheet/${updatedJob.trackingToken}`, {
        ...updatedJob,
        status: customerStatus(updatedJob.status),
      }).catch(() => {});
    }
  };

  const approvedProductionJobs = productionJobs.filter((job) => {
    return canShowJobInProduction(job, sentInvoices);
  });

  const handleLogin = (account) => {
    setRole(account.role);
    setSignedInAccount(account);
    setStaffProfile(null);
    setActiveView(navByRole[account.role][0]);
    setSignedIn(true);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setSignedIn(false);
    setRole(null);
    setSignedInAccount(null);
    setStaffProfile(null);
    setActiveView('Overview');
    setMobileMenuOpen(false);
  };

  const openView = (view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const profileMatch = window.location.pathname.match(/^\/c\/([^/?#]+)\/profile\/?$/);
  if (profileMatch) {
    return <CustomerPortalPage token={decodeURIComponent(profileMatch[1])} sentInvoices={sentInvoices} />;
  }

  const trackingMatch = window.location.pathname.match(/^\/c\/([^/?#]+)\/?$/);
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
            <NotificationBell role={role} currentRole={currentRole} onOpen={() => openView('Notifications')} />
            <div className="user-chip">
              <ProfilePhotoControl
                account={currentRole}
                onProfileImageChange={(profileImageUrl) => setStaffProfile((current) => ({ ...current, profileImageUrl }))}
              />
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
          onApproveInvoice: updateInvoiceApproval,
          sentInvoices,
          productionJobs: approvedProductionJobs,
          onCreateJob: createProductionJob,
          onUpdateJob: updateProductionJob,
        })}
      </main>
    </div>
  );
}

export default App;
