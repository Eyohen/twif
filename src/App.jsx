import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import LoginPage from './pages/auth/LoginPage';
import MyTasksPage from './pages/tailor/MyTasksPage';
import WeeklyLogPage from './pages/tailor/WeeklyLogPage';
import StoreManagerOverviewPage from './pages/store-manager/OverviewPage';
import StoreManagerCustomersPage from './pages/store-manager/CustomersPage';
import StoreManagerOrdersPage from './pages/store-manager/OrdersPage';
import AccountsInvoicesPage from './pages/accounts/InvoicesPage';
import AccountsPaymentsPage from './pages/accounts/PaymentsPage';
import AccountsInventoryReconciliationPage from './pages/accounts/InventoryReconciliationPage';
import UserManagementPage from './pages/owner/UserManagementPage';
import InventoryManagerOverviewPage from './pages/inventory/OverviewPage';
import InventoryListPage from './pages/inventory/InventoryListPage';
import { roles, demoCredentials, inventoryCategories, navByRole, accountTypeByRole } from './config/oms';
import { Stat, Status, SectionHeader } from './components/oms/Common';
import {
  money, todayIso, invoiceSeed, invoiceItemSeed, trackingTokenSeed, toNumber,
  dateInputValue, customerStatus, paymentStatusLabels, invoiceApprovalStatus,
  isInvoiceApproved, canShowJobInProduction, productionJobFromInvoice,
  mergeJobsByInvoice, classNames,
} from './utils/oms';

const trackingBaseUrl = (
  import.meta.env.VITE_TRACKING_BASE_URL ||
  window.location.origin ||
  'http://localhost:5173'
).replace(/\/+$/, '');

const trackingUrlForToken = (token) => `${trackingBaseUrl}/c/${token}`;
const OMS_SESSION_KEY = 'twif_oms_session';
const roleSlug = (value = '') => String(value || '').replaceAll('_', '-');
const viewSlug = (value = '') => String(value || '').toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const sessionFromStorage = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(OMS_SESSION_KEY) || 'null');
    if (!saved?.role || !navByRole[saved.role]) return null;
    const roleDetails = roles.find((item) => item.id === saved.role);
    const demoAccount = demoCredentials.find((item) => item.role === saved.role && (!saved.phone || item.phone === saved.phone));
    return { ...roleDetails, ...demoAccount, ...saved };
  } catch {
    return null;
  }
};


function Overview({ role, currentRole, sentInvoices = [], productionJobs = [], onUpdateJob, onApproveInvoice }) {
  const isTailor = role === 'tailor';

  if (isTailor) {
    return <TailorOverview currentRole={currentRole} productionJobs={productionJobs} onUpdateJob={onUpdateJob} />;
  }

  if (role === 'inventory_manager') return <InventoryManagerOverviewPage />;

  if (role === 'production_manager') {
    return <ProductionOverview productionJobs={productionJobs} />;
  }

  if (role === 'owner') {
    return <OwnerOverview sentInvoices={sentInvoices} productionJobs={productionJobs} />;
  }

  if (role === 'accounts') {
    return <AccountsOverview sentInvoices={sentInvoices} onApproveInvoice={onApproveInvoice} />;
  }

  if (role === 'store_manager') {
    return <StoreManagerOverviewPage sentInvoices={sentInvoices} productionJobs={productionJobs} />;
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

function AccountsOverview({ sentInvoices = [], onApproveInvoice }) {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.get('/oms/fabrics')
      .then((response) => setInventory(response.data?.data?.fabrics || []))
      .catch(() => setInventory([]));
  }, []);

  const pending = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts');
  const approved = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Approved');
  const flagged = sentInvoices.filter((invoice) => ['Flagged', 'Rejected'].includes(invoiceApprovalStatus(invoice)));
  const partial = sentInvoices.filter((invoice) => invoice.paymentStatus === 'Partial Paid');
  const paid = sentInvoices.filter((invoice) => invoice.paymentStatus === 'Fully Paid');
  const unpaid = sentInvoices.filter((invoice) => !['Fully Paid', 'Partial Paid'].includes(invoice.paymentStatus));
  const total = sentInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const pendingTotal = pending.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const approvedTotal = approved.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const partialTotal = partial.reduce((sum, invoice) => sum + Math.max(0, toNumber(invoice.total) - toNumber(invoice.paid)), 0);
  const lowStock = inventory.filter((item) => toNumber(item.quantity) <= toNumber(item.lowStockThreshold || 5));
  const outOfStock = inventory.filter((item) => toNumber(item.quantity) <= 0);
  const healthyStock = inventory.filter((item) => toNumber(item.quantity) > toNumber(item.lowStockThreshold || 5));
  const queue = (pending.length ? pending : sentInvoices).slice(0, 5);

  return (
    <div className="accounts-dashboard">
      <section className="accounts-kpis">
        {[
          ['Awaiting Review', pending.length, 'Invoices', money.format(pendingTotal), 'Total Amount', 'dark', '▣'],
          ['Approved (This Month)', approved.length, 'Invoices', money.format(approvedTotal), 'Total Amount', 'green', '▤'],
          ['Rejected / Flagged', flagged.length, 'Invoices', money.format(flagged.reduce((sum, invoice) => sum + toNumber(invoice.total), 0)), 'Total Amount', 'red', '⚑'],
          ['Partial Payments', partial.length, 'Invoices', money.format(partialTotal), 'Outstanding', 'gold', '◔'],
          ['Total Invoiced', money.format(total), 'Across all invoices', '↗ 18.7% vs last 30 days', '', 'chart', '⌁'],
          ['Inventory Alerts', lowStock.length, 'Items', 'Requires attention', '', 'alert', '△'],
        ].map(([label, value, line, amount, caption, tone, icon]) => (
          <article className={`accounts-kpi accounts-${tone}`} key={label}>
            <i>{icon}</i><span>{label}</span><strong>{value}</strong><small>{line}</small><b>{amount}</b>{caption ? <em>{caption}</em> : null}
          </article>
        ))}
      </section>

      <section className="accounts-primary-grid">
        <section className="accounts-panel invoice-review">
          <header><div><h2>Invoice Review Queue</h2><p>Invoices awaiting your action.</p></div><button>View all invoices →</button></header>
          <div className="accounts-table-wrap">
            <table><thead><tr><th>Invoice</th><th>Customer</th><th>Store</th><th>Total</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead>
            <tbody>{queue.map((invoice) => <tr key={invoice.invoiceNumber}>
              <td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customer}</td><td>{invoice.store}</td><td><strong>{money.format(invoice.total)}</strong></td>
              <td><Status>{invoice.orderStatus || 'Unpaid'}</Status></td><td><Status>{invoice.paymentStatus}</Status></td>
              <td><div className="accounts-row-actions"><button title="Approve" onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Approved')}>✓</button><button title="Reject" onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Rejected')}>×</button><button title="Flag" onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Flagged')}>⚑</button><button>•••</button></div></td>
            </tr>)}</tbody></table>
            {!queue.length ? <div className="accounts-empty">No invoices are awaiting review.</div> : null}
          </div>
          <footer>View full queue →</footer>
        </section>

        <section className="accounts-panel payment-overview">
          <header><h2>Payment Overview</h2></header>
          <div className="payment-overview-body">
            <div className="payment-donut" style={{ '--paid': `${sentInvoices.length ? (paid.length / sentInvoices.length) * 100 : 0}%`, '--partial': `${sentInvoices.length ? ((paid.length + partial.length) / sentInvoices.length) * 100 : 0}%` }}><span><strong>{sentInvoices.length}</strong>Total</span></div>
            <div className="payment-legend">
              {[['Paid in Full', paid.length, paid.reduce((sum, invoice) => sum + toNumber(invoice.total), 0), 'green'], ['Partial Paid', partial.length, partialTotal, 'gold'], ['Unpaid', unpaid.length, unpaid.reduce((sum, invoice) => sum + toNumber(invoice.total), 0), 'gray'], ['Overdue', flagged.length, flagged.reduce((sum, invoice) => sum + toNumber(invoice.total), 0), 'red']].map(([label, count, amount, tone]) => <article key={label}><i className={tone}/><span><strong>{label}</strong><small>{count} ({sentInvoices.length ? Math.round((count / sentInvoices.length) * 100) : 0}%)</small></span><b>{money.format(amount)}</b></article>)}
            </div>
          </div>
          <footer><span>Total Outstanding</span><strong>{money.format(partialTotal)}</strong></footer>
        </section>
      </section>

      <section className="accounts-secondary-grid">
        <section className="accounts-panel stock-snapshot"><header><h2>Inventory Reconciliation Snapshot</h2><small>As of {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</small></header><div>
          {[['Total Items', inventory.length, 'Across all categories', '◇'], ['In Stock', healthyStock.length, 'Available inventory', '✓'], ['Low Stock', lowStock.length, 'Below reorder level', '△'], ['Out of Stock', outOfStock.length, 'Requires attention', '⊖']].map(([label, value, detail, icon]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small><i>{icon}</i></article>)}
        </div><footer>View inventory →</footer></section>

        <section className="accounts-panel recent-alerts"><header><h2>Recent Inventory Alerts</h2><button>View all alerts →</button></header><div>
          {(lowStock.length ? lowStock : [{ id: 'a1', name: 'Satin Fabric (Black)', type: 'Fabrics', quantity: 4.2, unit: 'yards' }, { id: 'a2', name: 'Buttons (Metal)', type: 'Accessories', quantity: 8, unit: 'sets' }, { id: 'a3', name: 'Thread (Black)', type: 'Accessories', quantity: 0, unit: '' }]).slice(0, 5).map((item) => <article key={item.id}><i className={toNumber(item.quantity) <= 0 ? 'red' : ''}/><strong>{item.name}</strong><span>{item.type}</span><small className={toNumber(item.quantity) <= 0 ? 'red' : ''}>{toNumber(item.quantity) <= 0 ? 'Out of stock' : `${item.quantity} ${item.unit} left`}</small></article>)}
        </div></section>

        <section className="accounts-panel quick-actions"><header><h2>Quick Actions</h2></header><div>{[['✓', 'Approve Invoices'], ['⚑', 'Reject / Flag Invoices'], ['▣', 'Record Payment'], ['⟳', 'Inventory Reconciliation'], ['⇩', 'Download Reports'], ['▤', 'View Audit Log']].map(([icon, label]) => <button key={label}><i>{icon}</i>{label}</button>)}</div></section>
      </section>

      <section className="accounts-panel accounts-activity"><header><h2>Recent Activity</h2></header><div>
        {sentInvoices.slice(0, 5).map((invoice, index) => <article key={invoice.invoiceNumber}><i>{['✓', '▣', '⚑', '◇', '▤'][index]}</i><span><strong>{invoice.invoiceNumber} {invoiceApprovalStatus(invoice).toLowerCase()}</strong><small>by Funke</small><time>{invoice.createdAt || 'Recently'}</time></span></article>)}
        {!sentInvoices.length ? <div className="accounts-empty">Account activity will appear here.</div> : null}
        <button>View full activity →</button>
      </div></section>
    </div>
  );
}

function OwnerOverview({ sentInvoices = [], productionJobs = [] }) {
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState(todayIso());

  useEffect(() => {
    Promise.allSettled([api.get('/oms/fabrics'), api.get('/oms/customers'), api.get('/oms/staff')]).then(([fabricsResult, customersResult, staffResult]) => {
      if (fabricsResult.status === 'fulfilled') setInventory(fabricsResult.value.data?.data?.fabrics || []);
      if (customersResult.status === 'fulfilled') setCustomers(customersResult.value.data?.data?.customers || []);
      if (staffResult.status === 'fulfilled') setStaff(staffResult.value.data?.data?.staffUsers || []);
    });
  }, []);

  const filteredInvoices = useMemo(() => {
    const today = todayIso();
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const monthStart = `${today.slice(0, 7)}-01`;
    const yearStart = `${today.slice(0, 4)}-01-01`;
    if (period === 'today') return sentInvoices.filter(inv => String(inv.createdAt || '').slice(0, 10) === today);
    if (period === 'week') return sentInvoices.filter(inv => inv.createdAt && new Date(inv.createdAt) >= weekAgo);
    if (period === 'month') return sentInvoices.filter(inv => String(inv.createdAt || '').slice(0, 10) >= monthStart);
    if (period === 'year') return sentInvoices.filter(inv => String(inv.createdAt || '').slice(0, 10) >= yearStart);
    if (period === 'custom' && customFrom) return sentInvoices.filter(inv => {
      const d = String(inv.createdAt || '').slice(0, 10);
      return d >= customFrom && (!customTo || d <= customTo);
    });
    return sentInvoices;
  }, [sentInvoices, period, customFrom, customTo]);

  const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const completed = productionJobs.filter((job) => job.status === 'Ready');
  const inProgress = productionJobs.filter((job) => ['Assigned', 'In Progress'].includes(job.status));
  const pendingJobs = productionJobs.filter((job) => ['Order Sheet Confirmed'].includes(job.status));
  const delayed = productionJobs.filter((job) => job.delivery && new Date(`${job.delivery}T23:59:59`) < new Date() && job.status !== 'Ready');
  const lowStock = inventory.filter((item) => toNumber(item.quantity) <= toNumber(item.lowStockThreshold || 5));
  const outstanding = filteredInvoices.filter((invoice) => invoice.paymentStatus !== 'Fully Paid').reduce((sum, invoice) => sum + Math.max(0, toNumber(invoice.total) - toNumber(invoice.paid)), 0);
  const storeRows = ['Lekki', 'Ikeja', 'Surulere'].map((store) => {
    const storeInvoices = filteredInvoices.filter((invoice) => String(invoice.store).toLowerCase().includes(store.toLowerCase()));
    return { store, revenue: storeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0), orders: storeInvoices.length };
  });
  const topCustomers = customers.length ? [...customers].sort((a, b) => toNumber(b.lifetimeSpend) - toNumber(a.lifetimeSpend)).slice(0, 5) : filteredInvoices.slice(0, 5).map((invoice) => ({ id: invoice.invoiceNumber, fullName: invoice.customer, lifetimeSpend: invoice.total, totalOrders: 1 }));
  const tailorRows = staff.filter((person) => person.role === 'tailor').slice(0, 5);

  return (
    <div className="owner-dashboard">
      <div className="owner-period-filter">
        {[['today','Today'],['week','This Week'],['month','This Month'],['year','This Year'],['custom','Custom']].map(([key,label]) => (
          <button key={key} className={period === key ? 'active' : ''} onClick={() => setPeriod(key)}>{label}</button>
        ))}
        {period === 'custom' && (
          <div className="owner-custom-range">
            <input type="date" value={customFrom} max={customTo} onChange={e => setCustomFrom(e.target.value)} placeholder="From" />
            <span>→</span>
            <input type="date" value={customTo} min={customFrom} max={todayIso()} onChange={e => setCustomTo(e.target.value)} placeholder="To" />
          </div>
        )}
      </div>
      <section className="owner-kpis">{[
        ['Total Revenue (MTD)', money.format(totalRevenue), '↑ 18.7% vs last 30 days', 'gold', '▣'],
        ['Total Orders', filteredInvoices.length, '↑ 12.5% vs last 30 days', 'gold', '▤'],
        ['Completed Jobs', completed.length, '↑ 22.3% vs last 30 days', 'green', '▥'],
        ['Active Customers', customers.length, '↑ 8.1% vs last 30 days', 'blue', '♙'],
        ['Low Stock Items', lowStock.length, '↓ 14.3% vs last 30 days', 'red', '△'],
        ['Outstanding Payments', money.format(outstanding), '↓ 6.7% vs last 30 days', 'red', '▣'],
      ].map(([label, value, change, tone, icon], index) => <article className={`owner-kpi tone-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><small>{change}</small><i>{icon}</i>{index < 5 ? <div className="owner-sparkline"><b/><b/><b/><b/><b/><b/><b/></div> : null}</article>)}</section>

      <section className="owner-action-row">
        <section className="owner-panel action-insights"><header>Action Insights</header><div>
          {[
            ['▤', `${filteredInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts').length} invoices are awaiting Accounts approval.`, 'Review', 'gold'],
            ['△', `${delayed.length} orders are overdue by more than 2 days.`, 'View', 'red'],
            ['△', `${lowStock[0]?.name || 'Inventory'} requires restocking.`, 'Restock', 'blue'],
            ['↗', 'Revenue is up this month compared to last month.', 'View Report', 'green'],
            ['♙', `${topCustomers[0]?.fullName || 'A customer'} is a top customer this month.`, 'View Customer', 'blue'],
            ['♧', `${tailorRows[0]?.displayName || 'Production staff'} leads weekly production.`, 'View Performance', 'purple'],
          ].map(([icon, text, action, tone]) => <article key={text}><i className={tone}>{icon}</i><span>{text}</span><button className={tone}>{action}</button></article>)}
        </div><footer>View all insights &nbsp; →</footer></section>
        <section className="owner-panel owner-quick-actions"><header>Quick Actions</header><div>{[['✓', 'Approve Invoices'], ['▣', 'Review Payments'], ['♙', 'Assign Tailor'], ['▤', 'Create Invoice'], ['♙', 'Add Customer'], ['▣', 'Record Payment'], ['◇', 'Adjust Inventory'], ['▥', 'Generate Report']].map(([icon, label]) => <button key={label}><i>{icon}</i>{label}</button>)}</div></section>
      </section>

      <section className="owner-analytics-grid">
        <section className="owner-panel sales-overview"><header><span>Sales Overview</span><select><option>This Month</option></select></header><div className="sales-chart"><div className="chart-bars">{[28, 43, 36, 50, 62, 39, 72, 61, 48, 59, 92].map((height, index) => <i style={{ height: `${height}%` }} key={index}/>)}</div><svg viewBox="0 0 500 130" preserveAspectRatio="none"><polyline points="0,105 45,65 90,85 135,50 180,75 225,38 270,58 315,20 360,55 405,72 455,24 500,48"/></svg></div><footer>{[[money.format(totalRevenue), 'Total Revenue'], [filteredInvoices.length, 'Total Orders'], [filteredInvoices.length ? money.format(totalRevenue / filteredInvoices.length) : money.format(0), 'Avg. Order Value'], ['18.7%', 'Growth vs Last 30 Days']].map(([value, label]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</footer></section>
        <section className="owner-panel owner-production"><header><span>Production Overview</span><select><option>This Week</option></select></header><div><div className="owner-production-donut"><span><strong>{productionJobs.length}</strong>Total Jobs</span></div><div>{[['Completed', completed.length, 'green'], ['In Progress', inProgress.length, 'gold'], ['Pending', pendingJobs.length, 'blue'], ['Delayed', delayed.length, 'red']].map(([label, value, tone]) => <article key={label}><i className={tone}/><span>{label}</span><strong>{value}</strong></article>)}</div></div><footer><div><strong>{completed.length}</strong><small>Ready for Collection</small></div><div><strong className="red">{delayed.length}</strong><small>Delayed Jobs</small></div><div><strong className="green">{productionJobs.length ? Math.round((completed.length / productionJobs.length) * 100) : 0}%</strong><small>Completion Rate</small></div></footer></section>
        <section className="owner-panel store-performance"><header><span>Store Performance</span><select><option>This Month</option></select></header><table><thead><tr><th>Store</th><th>Revenue</th><th>Orders</th><th>% Revenue</th><th>Status</th></tr></thead><tbody>{storeRows.map((row, index) => <tr key={row.store}><td>{row.store}</td><td>{money.format(row.revenue)}</td><td>{row.orders}</td><td>{totalRevenue ? Math.round((row.revenue / totalRevenue) * 100) : 0}%</td><td><i className={index === 0 ? 'green' : index === 1 ? 'gold' : 'red'}/>{index === 0 ? 'Excellent' : index === 1 ? 'Average' : 'Needs Attention'}</td></tr>)}</tbody></table><footer>View all stores &nbsp; →</footer></section>
      </section>

      <section className="owner-bottom-grid">
        <section className="owner-panel owner-table-panel"><header><span>Top Customers (This Month)</span><button>View all customers →</button></header><table><thead><tr><th>Customer</th><th>Revenue</th><th>Orders</th><th>Last Order</th></tr></thead><tbody>{topCustomers.map((customer) => <tr key={customer.id || customer.fullName}><td><i>{customer.fullName?.slice(0, 1)}</i>{customer.fullName}</td><td>{money.format(customer.lifetimeSpend)}</td><td>{customer.totalOrders || 1}</td><td>Recently</td></tr>)}</tbody></table></section>
        <section className="owner-panel owner-table-panel"><header><span>Inventory Alerts</span><button>View full inventory →</button></header><table><thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Status</th><th>Location</th></tr></thead><tbody>{lowStock.slice(0, 5).map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.type}</td><td>{item.quantity} {item.unit}</td><td><Status>{toNumber(item.quantity) <= 0 ? 'Out of Stock' : 'Low Stock'}</Status></td><td>{item.store || 'Lekki'}</td></tr>)}</tbody></table></section>
        <section className="owner-panel owner-table-panel"><header><span>Staff Performance (This Week)</span><button>View all staff →</button></header><table><thead><tr><th>Staff Member</th><th>Role</th><th>Jobs Completed</th><th>Rating</th></tr></thead><tbody>{tailorRows.map((person, index) => <tr key={person.id}><td><i>{person.displayName?.slice(0, 1)}</i>{person.displayName}</td><td>Tailor</td><td>{productionJobs.filter((job) => job.tailor === person.displayName && job.status === 'Ready').length}</td><td>★ {(4.9 - index * .2).toFixed(1)}</td></tr>)}</tbody></table></section>
      </section>
    </div>
  );
}

function OwnerStoresPage({ sentInvoices = [] }) {
  const [stores, setStores] = useState([
    { id: 1, name: 'Lekki Store', location: 'Lekki Phase 1, Lagos', manager: 'Bola', phone: '08012345678', status: 'Active' },
    { id: 2, name: 'Ikeja Store', location: 'Allen Avenue, Ikeja, Lagos', manager: 'Grace', phone: '08023456789', status: 'Active' },
    { id: 3, name: 'VI Store', location: 'Victoria Island, Lagos', manager: '—', phone: '—', status: 'Coming Soon' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const emptyForm = { name: '', location: '', manager: '', phone: '', status: 'Active' };
  const [form, setForm] = useState(emptyForm);

  const storeRevenue = (storeName) => {
    const matches = sentInvoices.filter(inv => String(inv.store || '').toLowerCase().includes(storeName.toLowerCase().split(' ')[0]));
    return { revenue: matches.reduce((s, inv) => s + toNumber(inv.total), 0), orders: matches.length };
  };

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = (store) => { setForm({ name: store.name, location: store.location, manager: store.manager, phone: store.phone, status: store.status }); setEditing(store.id); setShowForm(true); };
  const saveStore = (e) => {
    e.preventDefault();
    if (editing) {
      setStores(current => current.map(s => s.id === editing ? { ...s, ...form } : s));
    } else {
      setStores(current => [...current, { id: Date.now(), ...form }]);
    }
    setShowForm(false);
  };
  const deleteStore = () => {
    setStores(current => current.filter(s => s.id !== deletingId));
    setDeletingId(null);
  };

  const totalRevenue = stores.reduce((s, store) => s + storeRevenue(store.name).revenue, 0);
  const activeStores = stores.filter(s => s.status === 'Active');
  const topStore = activeStores.reduce((best, store) => {
    const { revenue } = storeRevenue(store.name);
    return !best || revenue > storeRevenue(best.name).revenue ? store : best;
  }, null);

  return (
    <div className="owner-stores-page">
      <section className="owner-stores-kpis">
        {[
          ['▣', 'Total Stores', stores.length, `${activeStores.length} active`, 'gold'],
          ['✓', 'Active Stores', activeStores.length, 'Currently operating', 'green'],
          ['▤', 'Total Revenue', money.format(totalRevenue), 'Across all stores', 'blue'],
          ['↗', 'Top Store', topStore?.name || '—', money.format(storeRevenue(topStore?.name || '').revenue), 'purple'],
        ].map(([icon, label, value, detail, tone]) => (
          <article key={label} className={`owner-store-kpi tone-${tone}`}>
            <i>{icon}</i><span><small>{label}</small><strong>{value}</strong><p>{detail}</p></span>
          </article>
        ))}
      </section>

      <section className="owner-stores-panel panel">
        <header className="owner-stores-header">
          <div><h2>Store Management</h2><p>Create, monitor and manage your stores.</p></div>
          <button className="primary-action" type="button" onClick={openCreate}>＋ &nbsp; New Store</button>
        </header>
        <div className="owner-stores-table-wrap">
          <table className="owner-stores-table">
            <thead><tr><th>Store</th><th>Location</th><th>Manager</th><th>Phone</th><th>Revenue</th><th>Orders</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {stores.map(store => {
                const { revenue, orders } = storeRevenue(store.name);
                return (
                  <tr key={store.id}>
                    <td><strong>{store.name}</strong></td>
                    <td>{store.location}</td>
                    <td>{store.manager}</td>
                    <td>{store.phone}</td>
                    <td><strong>{money.format(revenue)}</strong></td>
                    <td>{orders}</td>
                    <td><Status>{store.status}</Status></td>
                    <td className="store-actions-cell">
                      <button type="button" onClick={() => openEdit(store)}>Edit</button>
                      <button type="button" className="danger-action" onClick={() => setDeletingId(store.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="receive-stock-backdrop">
          <form className="owner-store-form" onSubmit={saveStore}>
            <button type="button" className="modal-close" onClick={() => setShowForm(false)}>×</button>
            <h2>{editing ? 'Edit Store' : 'New Store'}</h2>
            <p>{editing ? 'Update store information.' : 'Add a new store location to the platform.'}</p>
            <label>Store Name<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lekki Store" /></label>
            <label>Location / Address<input required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Lekki Phase 1, Lagos" /></label>
            <label>Manager Name<input value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} placeholder="Assigned store manager" /></label>
            <label>Phone Number<input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Store contact number" /></label>
            <label>Status
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option>Active</option>
                <option>Coming Soon</option>
                <option>Inactive</option>
              </select>
            </label>
            <footer>
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="primary-action">{editing ? 'Save Changes' : 'Create Store'}</button>
            </footer>
          </form>
        </div>
      )}

      {deletingId && (
        <div className="receive-stock-backdrop">
          <div className="owner-store-form">
            <h2>Delete Store?</h2>
            <p>Are you sure you want to delete <strong>{stores.find(s => s.id === deletingId)?.name}</strong>? This action cannot be undone.</p>
            <footer>
              <button type="button" onClick={() => setDeletingId(null)}>Cancel</button>
              <button type="button" className="danger-action" onClick={deleteStore}>Yes, Delete Store</button>
            </footer>
          </div>
        </div>
      )}
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

function StoreInvoicesView({ sentInvoices = [], currentRole, onInvoiceSent }) {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const filteredInvoices = sentInvoices.filter((invoice) => {
    const matchesSearch = `${invoice.invoiceNumber} ${invoice.customer} ${invoice.store} ${invoice.paymentStatus}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All'
      || (statusFilter === 'Pending' && invoiceApprovalStatus(invoice) === 'Pending Accounts')
      || (statusFilter === 'Approved' && isInvoiceApproved(invoice))
      || (statusFilter === 'Partial' && invoice.paymentStatus === 'Partial Paid');
    return matchesSearch && matchesStatus;
  });
  const total = sentInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const pending = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts');
  const approved = sentInvoices.filter(isInvoiceApproved);
  const partial = sentInvoices.filter((invoice) => invoice.paymentStatus === 'Partial Paid');

  if (creating) {
    return (
      <div className="store-invoice-create">
        <div className="store-detail-toolbar">
          <button type="button" onClick={() => setCreating(false)}>← &nbsp; Back to Invoices</button>
        </div>
        <NewInvoiceView currentRole={currentRole} onInvoiceSent={(invoice) => {
          onInvoiceSent?.(invoice);
          setCreating(false);
        }} />
      </div>
    );
  }

  return (
    <div className="store-invoices-dashboard">
      <section className="store-invoice-kpis">
        {[
          ['▤', 'Total Invoices', sentInvoices.length, money.format(total), 'gold'],
          ['⌛', 'Pending Approval', pending.length, 'Waiting for Accounts', 'dark'],
          ['✓', 'Approved', approved.length, 'Released for production', 'green'],
          ['◔', 'Partial Payments', partial.length, 'Outstanding balances', 'blue'],
        ].map(([icon, label, value, detail, tone]) => <article className={`store-order-kpi ${tone}`} key={label}><i>{icon}</i><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>
      <section className="store-invoices-panel">
        <header>
          <div><h2>Sent Invoices</h2><p>Review and manage every invoice sent to customers.</p></div>
          <button className="new-invoice-button" type="button" onClick={() => setCreating(true)}>＋ &nbsp; New Invoice</button>
        </header>
        <div className="store-invoice-tools">
          <label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, customer or store..." /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Pending</option><option>Approved</option><option>Partial</option></select>
          <button>⇅ &nbsp; Newest first</button>
        </div>
        <div className="store-invoice-table-wrap">
          <table className="store-invoice-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Store</th><th>Date Sent</th><th>Total</th><th>Payment</th><th>Accounts Status</th><th>Order Status</th><th>Action</th></tr></thead>
            <tbody>{filteredInvoices.map((invoice) => <tr key={invoice.invoiceNumber}>
              <td><strong>{invoice.invoiceNumber}</strong></td>
              <td><div className="invoice-customer-cell"><i>{invoice.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span><strong>{invoice.customer}</strong><small>{invoice.email || invoice.phone || 'Customer'}</small></span></div></td>
              <td>{invoice.store}</td>
              <td>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              <td><strong>{money.format(invoice.total)}</strong></td>
              <td><Status>{invoice.paymentStatus}</Status></td>
              <td><Status>{invoiceApprovalStatus(invoice)}</Status></td>
              <td><Status>{invoice.orderStatus || 'Awaiting'}</Status></td>
              <td><div className="store-invoice-actions"><button>View</button><button>⋮</button></div></td>
            </tr>)}</tbody>
          </table>
          {!filteredInvoices.length ? <div className="accounts-empty">{sentInvoices.length ? 'No invoices match your search.' : 'No invoices have been sent yet.'}</div> : null}
        </div>
        <footer><span>Showing {filteredInvoices.length ? 1 : 0} to {filteredInvoices.length} of {sentInvoices.length} invoices</span><div><button>‹</button><button className="active">1</button><button>›</button><button>10 / page⌄</button></div></footer>
      </section>
    </div>
  );
}

function StoreOrdersView({ sentInvoices = [] }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Orders');
  const [sort, setSort] = useState('Newest first');
  const orders = sentInvoices.map((invoice) => ({
    ...invoice,
    job: productionJobFromInvoice(invoice),
    displayStatus: invoice.orderSheet?.status || invoice.orderStatus || invoiceApprovalStatus(invoice),
  }));
  const counts = {
    'All Orders': orders.length,
    'Pending Approval': orders.filter((order) => invoiceApprovalStatus(order) === 'Pending Accounts').length,
    'In Progress': orders.filter((order) => ['Assigned', 'In Progress'].includes(order.displayStatus)).length,
    'Ready for Collection': orders.filter((order) => ['Ready', 'Ready for Collection'].includes(order.displayStatus)).length,
    Unassigned: orders.filter((order) => !order.job?.tailor || order.job?.tailor === 'Unassigned').length,
  };
  const visibleOrders = orders
    .filter((order) => filter === 'All Orders'
      || (filter === 'Pending Approval' && invoiceApprovalStatus(order) === 'Pending Accounts')
      || (filter === 'In Progress' && ['Assigned', 'In Progress'].includes(order.displayStatus))
      || (filter === 'Ready for Collection' && ['Ready', 'Ready for Collection'].includes(order.displayStatus))
      || (filter === 'Unassigned' && (!order.job?.tailor || order.job?.tailor === 'Unassigned')))
    .filter((order) => `${order.invoiceNumber} ${order.customer} ${order.item}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'Oldest first'
      ? new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      : new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (selectedInvoice) {
    const invoice = selectedInvoice;
    const job = invoice.job || {};
    const paidAmount = toNumber(invoice.paid || invoice.amountPaid || (invoice.paymentStatus === 'Fully Paid' ? invoice.total : invoice.paymentStatus === 'Partial Paid' ? toNumber(invoice.total) / 2 : 0));
    const balance = Math.max(0, toNumber(invoice.total) - paidAmount);
    return (
      <div className="store-order-detail">
        <div className="store-detail-toolbar"><button type="button" onClick={() => setSelectedInvoice(null)}>← &nbsp; Back to Orders</button><div><button>▣ &nbsp; Print</button><button>More &nbsp; •••</button></div></div>
        <section className="store-order-hero">
          <div><span>{invoice.invoiceNumber}</span><h2>{invoice.customer}</h2><p>{invoice.item} · {invoice.pieces || job.pieces || 1} pieces · {invoice.store}</p></div>
          <Status>{invoice.paymentStatus}</Status>
          <dl><div><dt>▣ &nbsp; Invoice Date</dt><dd>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</dd></div><div><dt>▣ &nbsp; Due Date</dt><dd>{job.delivery ? new Date(`${job.delivery}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</dd></div><div><dt>▱ &nbsp; Store</dt><dd>{invoice.store} Store</dd></div></dl>
        </section>
        <nav className="store-detail-tabs">{['Order Details', 'Items & Pricing', 'Payments', 'Communications', 'Notes & History'].map((tab, index) => <button className={index === 0 ? 'active' : ''} key={tab}>{tab}</button>)}</nav>
        <div className="store-detail-grid">
          <div className="store-detail-main">
            <section className="store-detail-panel order-information"><h3>Order Information</h3><dl>
              <div><dt>Payment Status</dt><dd><Status>{invoice.paymentStatus}</Status></dd><dt>Payment Method</dt><dd>{invoice.paymentMethod || 'Bank Transfer'}</dd><dt>Store</dt><dd>{invoice.store} Store</dd><dt>Customer Phone</dt><dd>{invoice.phone || job.phone || '—'}</dd></div>
              <div><dt>Invoice Number</dt><dd>{invoice.invoiceNumber}</dd><dt>Sales Person</dt><dd>{invoice.createdBy || 'Bola'}</dd><dt>Customer Email</dt><dd>{invoice.email || '—'}</dd></div>
            </dl></section>
            <section className="store-detail-panel production-details"><h3>Production Details</h3><dl><div><dt>♙ &nbsp; Tailor</dt><dd>{job.tailor || 'Unassigned'}</dd></div><div><dt>▦ &nbsp; Fabric</dt><dd>{job.fabric || 'Not selected'}</dd></div><div><dt>▧ &nbsp; Style Images</dt><dd>{job.images || 0}</dd></div><div><dt>▤ &nbsp; Special Instructions</dt><dd>{job.productionNote || job.designNotes || invoice.itemNote || 'No special instructions'}</dd></div></dl></section>
            <section className="store-detail-panel order-timeline"><h3>Timeline</h3><div><article className="done"><i>✓</i><span><strong>Invoice Created</strong><small>by {invoice.createdBy || 'Bola'}</small></span><time>{invoice.createdAt || 'Recently'}</time></article><article className="paid"><i>●</i><span><strong>Payment Made ({invoice.paymentStatus})</strong><small>{money.format(paidAmount)} received via {invoice.paymentMethod || 'Bank Transfer'}</small></span><time>Recently</time></article><article><i>○</i><span><strong>{invoiceApprovalStatus(invoice) === 'Approved' ? 'Accounts Approved' : 'Awaiting Approval'}</strong><small>{invoiceApprovalStatus(invoice) === 'Approved' ? 'Invoice approved by accounts' : 'Waiting for accounts approval'}</small></span><time>Recently</time></article></div></section>
          </div>
          <aside className="store-detail-rail">
            <section className="store-detail-panel order-summary"><h3>Order Summary</h3><dl><div><dt>Invoice Total</dt><dd>{money.format(invoice.total)}</dd></div><div><dt>Amount Paid</dt><dd className="green">{money.format(paidAmount)}</dd></div><div><dt>Balance Due</dt><dd className="red">{money.format(balance)}</dd></div></dl><div><span>Balance Due</span><strong>{money.format(balance)}</strong></div></section>
            <section className="store-detail-panel detail-actions"><h3>Quick Actions</h3>{['⊕  Record Payment', '➤  Send Payment Reminder', '⌕  Edit Order', '♲  Cancel Order'].map((action, index) => <button className={index === 3 ? 'danger' : ''} key={action}>{action}</button>)}</section>
            <section className="store-detail-panel detail-documents"><h3>Documents</h3>{[['▤', 'Invoice PDF', 'Download'], ['▤', 'Order Sheet', 'Download'], ['▧', `Style Images (${job.images || 0})`, 'View']].map(([icon, label, action]) => <article key={label}><i>{icon}</i><span><strong>{label}</strong><small>{action}</small></span></article>)}</section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="store-orders-dashboard">
      <section className="store-order-kpis">
        {[
          ['▤', 'Invoices Sent', orders.length, 'Live customer invoices', 'gold'],
          ['⌛', 'Pending Approval', counts['Pending Approval'], 'Waiting for accounts', 'dark'],
          ['▥', 'Active Orders', counts['In Progress'], 'Currently in production', 'green'],
          ['✓', 'Ready Orders', counts['Ready for Collection'], 'Ready for customer handoff', 'blue'],
        ].map(([icon, label, value, detail, tone]) => <article className={`store-order-kpi ${tone}`} key={label}><i>{icon}</i><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>
      <section className="store-orders-panel">
        <header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by invoice, customer..." /></label><button>▽ &nbsp; Filter</button><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Newest first</option><option>Oldest first</option></select><button className="new-order">＋ &nbsp; New Order</button></header>
        <nav>{Object.keys(counts).map((tab) => <button className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)} key={tab}>{tab} <span>{counts[tab]}</span></button>)}</nav>
        <div className="store-order-grid">{visibleOrders.map((invoice) => {
          const job = invoice.job || {};
          return <article className="store-order-card" key={invoice.invoiceNumber} onClick={() => setSelectedInvoice(invoice)}>
            <header><span>{invoice.invoiceNumber}</span><Status>{invoice.displayStatus}</Status></header><h3>{invoice.customer}</h3><p>{invoice.item} · {invoice.pieces || job.pieces || 1} pieces · {invoice.store}</p>
            <div className="card-due">▣ &nbsp; Due: {job.delivery ? new Date(`${job.delivery}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</div>
            <div className="card-total"><small>Total</small><strong>{money.format(invoice.total)}</strong></div>
            <dl><div><dt>Tailor</dt><dd>{job.tailor || 'Unassigned'}</dd></div><div><dt>Fabric</dt><dd>{job.fabric || 'Not selected'}</dd></div></dl>
            <footer><span>▧ &nbsp; Style Images<br/><b>{job.images || 0}</b></span><button aria-label="View order">›</button></footer>
          </article>;
        })}{!visibleOrders.length ? <div className="accounts-empty">No orders match this view.</div> : null}</div>
        <footer><span>Showing 1 to {visibleOrders.length} of {orders.length} orders</span><div><button>‹</button><button className="active">1</button><button>›</button></div></footer>
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
    paymentStatus: '',
    paymentMethod: '',
    eliteDiscountEnabled: false,
    eliteDiscountAmount: 0,
    storeCreditApplied: 0,
    trackingUrl: '',
    notes: 'Your order will be ready in 3-4 weeks from date of payment and measurements.\nThis invoice is only valid for 48 hours.',
  });
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const customerSuggestionsRef = useRef(null);

  useEffect(() => {
    api.get('/oms/customers')
      .then((response) => setCustomers(response.data?.data?.customers || []))
      .catch(() => {});
  }, []);

  const customerSuggestions = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c) =>
      c.fullName?.toLowerCase().includes(q) || c.phone?.includes(q)
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const selectCustomer = (customer) => {
    setForm((current) => ({
      ...current,
      customerName: customer.fullName || '',
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
    }));
    setCustomerSearch('');
  };
  const [items, setItems] = useState([
    { id: invoiceItemSeed(), description: '', rate: 0, quantity: 1, discountPercent: 0, amount: 0, note: '' },
  ]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewTab, setPreviewTab] = useState('invoice');
  const [paymentEvidence, setPaymentEvidence] = useState(null);
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
    paymentEvidence: paymentEvidence ? {
      name: paymentEvidence.name,
      type: paymentEvidence.type,
      size: paymentEvidence.size,
      dataUrl: paymentEvidence.dataUrl,
      uploadedAt: paymentEvidence.uploadedAt,
    } : null,
  });

  const evidenceRequired = form.paymentStatus && form.paymentStatus !== 'unpaid';
  const selectEvidence = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('Payment evidence must be an image or screenshot.'); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage('Payment evidence must be smaller than 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPaymentEvidence({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result, uploadedAt: new Date().toISOString() });
    reader.readAsDataURL(file);
  };

  const validateInvoice = () => {
    if (!form.customerName.trim() || !form.customerEmail.trim()) return 'Select a customer and provide their email address.';
    if (!items.some((item) => item.description.trim())) return 'Add at least one invoice item.';
    if (evidenceRequired && !paymentEvidence) return 'Upload payment evidence for a partially or fully paid invoice.';
    return '';
  };

  const previewInvoice = async () => {
    setMessage('');
    const validationMessage = validateInvoice();
    if (validationMessage) { setMessage(validationMessage); return; }
    try {
      const response = await api.post('/oms/invoices/html-preview', invoicePayload(), {
        responseType: 'text',
      });
      setPreviewHtml(response.data);
      setPreviewMode(true);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to preview invoice');
    }
  };

  const sendInvoice = async () => {
    setSending(true);
    setMessage('');
    const validationMessage = validateInvoice();
    if (validationMessage) { setMessage(validationMessage); setSending(false); return; }

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

  if (previewMode) {
    return <div className="invoice-preview-page-v2">
      <header><button type="button" onClick={() => setPreviewMode(false)}>← &nbsp; Back to Invoice</button><div><small>INVOICE</small><strong>{form.invoiceNumber}</strong><Status>Not Sent Yet</Status></div></header>
      <section className="invoice-preview-title"><div><h2>{previewTab === 'invoice' ? 'Invoice Preview' : 'Email Preview'}</h2><p>This is how your {previewTab === 'invoice' ? 'invoice' : 'email'} will appear to the customer.</p></div><nav><button className={previewTab === 'invoice' ? 'active' : ''} onClick={() => setPreviewTab('invoice')}>Invoice Preview</button><button className={previewTab === 'email' ? 'active' : ''} onClick={() => setPreviewTab('email')}>Email Preview</button></nav></section>
      {previewTab === 'invoice' ? <section className="invoice-document-preview"><div className="invoice-preview-tools"><button>−</button><span>100%</span><button>＋</button><button>Fit Width</button><span/><button onClick={() => window.print()}>⇩</button><button onClick={() => window.print()}>▣</button></div><iframe title="Invoice preview" srcDoc={previewHtml}/></section> : <section className="email-preview-layout"><main><dl><dt>From:</dt><dd>The Way It Fits &lt;info@twif.com&gt;</dd><dt>To:</dt><dd>{form.customerEmail}</dd><dt>Subject:</dt><dd>Your TWIF Invoice {form.invoiceNumber}</dd></dl><article><div className="email-logo">twif</div><h2>Your Invoice is Ready</h2><p>Hello {form.customerName.split(' ')[0] || 'Customer'},</p><p>Thank you for choosing The Way It Fits. Your invoice has been prepared and is attached below.</p><section>{[['Invoice Number', form.invoiceNumber], ['Amount Due', money.format(balanceDue)], ['Due Date', new Date(`${form.dueDate}T00:00:00`).toLocaleDateString('en-GB')], ['Status', paymentStatusLabels[form.paymentStatus]]].map(([label,value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</section><div><button>Download Invoice PDF</button><button>Track Your Order</button></div><h3>Order Summary</h3>{items.filter((item) => item.description).map((item) => <p className="email-order-line" key={item.id}><span>{item.description} × {item.quantity}</span><strong>{money.format(item.amount)}</strong></p>)}<p className="email-balance"><span>Balance Due</span><strong>{money.format(balanceDue)}</strong></p></article></main><aside><h3>Email Details</h3><dl><dt>Recipient</dt><dd>{form.customerEmail}</dd><dt>Subject</dt><dd>Your TWIF Invoice {form.invoiceNumber}</dd><dt>Attachment</dt><dd>{form.invoiceNumber}.pdf</dd><dt>Tracking Link</dt><dd>✓ Will be included</dd><dt>Payment Evidence</dt><dd>{paymentEvidence?.name || 'Not required'}</dd></dl></aside></section>}
      {message ? <div className="invoice-message">{message}</div> : null}
      <footer><button type="button" onClick={() => setPreviewMode(false)}>Back</button><div><button onClick={() => window.print()}>⇩ &nbsp; Download PDF</button><button onClick={() => setPreviewTab('email')}>✉ &nbsp; Preview Email</button><button className="primary-action" onClick={sendInvoice} disabled={sending}>{sending ? 'Sending…' : '➤  Send Invoice'}</button></div></footer>
    </div>;
  }

  return (
    <div className="new-invoice-page-v2">
      <header className="new-invoice-toolbar"><div><button>Save Draft</button><button onClick={previewInvoice}>Preview Invoice</button><button className="primary-action" onClick={sendInvoice} disabled={sending}>{sending ? 'Sending…' : '✉  Send Invoice'}</button></div></header>
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
              <option value="" disabled>— Select status —</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial_paid">Partial Paid</option>
              <option value="fully_paid">Fully Paid</option>
            </select>
          </label>
          <label>Payment method
            <select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)}>
              <option value="" disabled>— Select method —</option>
              <option value="transfer">Transfer</option>
              <option value="card">Card</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <label>Customer name
            <div className="customer-search-wrap" ref={customerSuggestionsRef}>
              <input
                value={form.customerName}
                onChange={(event) => { updateForm('customerName', event.target.value); setCustomerSearch(event.target.value); }}
                onFocus={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search or type customer name..."
                autoComplete="off"
              />
              {customerSearch.trim() && customerSuggestions.length > 0 && (
                <div className="customer-suggestions">
                  {customerSuggestions.map((customer) => (
                    <button type="button" key={customer.id} onMouseDown={() => selectCustomer(customer)}>
                      <strong>{customer.fullName}</strong>
                      <small>{customer.phone || customer.email || ''}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            <input readOnly value={trackingUrlForToken(form.trackingToken)} className="readonly-field" />
          </label>
          <label className="wide-field">Other notes
            <textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} />
          </label>
          {evidenceRequired ? <label className="wide-field payment-evidence-upload">Payment evidence *<input type="file" accept="image/*" onChange={selectEvidence}/>{paymentEvidence ? <span><img src={paymentEvidence.dataUrl} alt="Payment evidence preview"/><b>{paymentEvidence.name}</b><button type="button" onClick={() => setPaymentEvidence(null)}>Remove</button></span> : <small>Upload a receipt screenshot or payment photo (maximum 5 MB).</small>}</label> : <div className="wide-field unpaid-evidence-note">No payment evidence is required for an unpaid invoice.</div>}
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
          <button onClick={previewInvoice}>Preview Invoice</button>
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
  const [query, setQuery] = useState('');
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [toast, setToast] = useState('');
  const [inventory, setInventory] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [allocatingJobId, setAllocatingJobId] = useState(null);
  const toastTimerRef = useRef(null);
  const filteredJobs = productionJobs.filter((job) => (
    (statusFilter === 'All' ? true : job.status === statusFilter)
    && `${job.customer} ${job.invoiceNumber} ${job.item}`.toLowerCase().includes(query.toLowerCase())
  ));
  const productionTabs = ['All', 'Order Sheet Confirmed', 'Assigned', 'In Progress', 'Ready'];
  const readyToAssign = productionJobs.filter((job) => job.status === 'Order Sheet Confirmed').length;
  const inProgress = productionJobs.filter((job) => ['Assigned', 'In Progress'].includes(job.status)).length;
  const readyForCollection = productionJobs.filter((job) => job.status === 'Ready').length;
  const exceptionCards = [
    ['⚠', 'Fabric Discrepancy', productionJobs.filter((job) => job.fabric && !job.fabricConfirmed && job.fabric !== 'Client supplied').length, 'Stock issues', 'High Priority'],
    ['✂', 'Missing Measurements', productionJobs.filter((job) => !job.measurements).length, 'Cannot proceed', 'Medium Priority'],
    ['▧', 'Missing Style Images', productionJobs.filter((job) => !job.images).length, 'References incomplete', 'Medium Priority'],
    ['◇', 'Awaiting Client Fabric', productionJobs.filter((job) => job.fabric === 'Client supplied' && !job.fabricConfirmed).length, 'Not yet received', 'Medium Priority'],
    ['♙', 'Reassignment / Quality Hold', productionJobs.filter((job) => job.status === 'Quality Hold').length, 'Action required', 'Low Priority'],
  ];
  const exceptionTotal = exceptionCards.reduce((total, card) => total + card[2], 0);

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
    <div className="production-board production-dashboard">
      {toast ? <div className="app-toast">{toast}</div> : null}
      <div className="production-dashboard-main">
      <section className="production-kpis">
        {[
          ['♙', 'Ready to Assign', readyToAssign, 'Awaiting tailor allocation', 'gold'],
          ['▣', 'In Progress', inProgress, 'Currently with tailors', 'purple'],
          ['✓', 'Ready for Collection', readyForCollection, 'Awaiting store pickup', 'green'],
          ['⚑', 'Completed Today', readyForCollection, 'Marked as ready', 'blue'],
        ].map(([icon, label, value, detail, tone]) => (
          <article className={`production-kpi tone-${tone}`} key={label}>
            <i>{icon}</i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
          </article>
        ))}
      </section>
      <section className="production-exceptions-panel">
        <header><strong>Production Exceptions <b>{exceptionTotal}</b></strong><button type="button">View all exceptions →</button></header>
        <div className="production-exception-grid">
          {exceptionCards.map(([icon, label, value, detail, priority], index) => (
            <article className={index === 0 ? 'high' : index === 4 ? 'low' : ''} key={label}>
              <i>{icon}</i><div><strong>{label}</strong><b>{value}</b><small>{detail}</small></div><span>{priority}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="panel production-jobs-panel">
        <div className="production-active-header">
          <strong>Active Jobs</strong>
          <div><label>⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs by customer or item..." /></label><button>▽ Filter</button><button>⇅ Sort</button></div>
        </div>
        <div className="production-tabs">
          {productionTabs.map((tab) => (
            <button
              key={tab}
              className={statusFilter === tab ? 'active' : ''}
              onClick={() => setStatusFilter(tab)}
            >
              {tab === 'Order Sheet Confirmed' ? 'Ready to Assign' : tab === 'Ready' ? 'Ready for Collection' : tab} <span>{tab === 'All' ? productionJobs.length : productionJobs.filter((job) => job.status === tab).length}</span>
            </button>
          ))}
        </div>
        <div className="production-job-register">
          {filteredJobs.length ? filteredJobs.map((order) => (
            <article className={classNames('production-register-item', expandedJobId === order.id && 'is-open')} key={order.id}>
              <div className="production-register-row">
                <button className="job-chevron" type="button" onClick={() => setExpandedJobId(expandedJobId === order.id ? null : order.id)} aria-label={`View ${order.customer} job`}>⌄</button>
                <div className="register-customer">
                  <i>{order.customer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i>
                  <span><strong>{order.customer}</strong><small>{order.invoiceNumber}</small></span>
                </div>
                <div className="register-item"><strong>{order.item}</strong><small>{order.pieces} {order.pieces === 1 ? 'piece' : 'pieces'}</small></div>
                <div className="register-delivery"><i>▣</i><span><strong>{order.delivery ? new Date(`${order.delivery}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date'}</strong><small>Delivery</small></span></div>
                <Status>{order.status === 'Order Sheet Confirmed' ? 'Ready to Assign' : order.status === 'Ready' ? 'Ready for Collection' : order.status}</Status>
                <div className="register-meta"><small>Tailor</small><strong className={!order.tailor || order.tailor === 'Unassigned' ? 'pending' : ''}>{order.tailor || 'Unassigned'}</strong></div>
                <div className="register-meta fabric"><small>Fabric</small><strong className={order.fabricConfirmed ? 'confirmed' : 'pending'}>{order.fabric || 'Not selected'} · {order.fabricConfirmed ? 'Confirmed' : 'Pending'}</strong></div>
                <button className="register-view-button" type="button" onClick={() => setExpandedJobId(expandedJobId === order.id ? null : order.id)}>View Job</button>
                <button className="register-menu" type="button" aria-label="More actions">⋮</button>
              </div>
              {expandedJobId === order.id ? <div className="production-job-drawer">
                <dl>
                  <div><dt>Style images</dt><dd>{order.images || 0} references</dd></div>
                  <div><dt>Measurements</dt><dd>{order.measurements ? 'Included' : 'Not added'}</dd></div>
                  <div><dt>Payment</dt><dd>{order.payment || '—'}</dd></div>
                  <div><dt>Store</dt><dd>{order.store || '—'}</dd></div>
                </dl>
                <dl>
                  <div><dt>Fabric status</dt><dd>{order.fabric} · {order.fabricConfirmed ? 'Confirmed' : 'Not confirmed'}</dd></div>
                  <div><dt>Production note</dt><dd>{order.productionNote || order.designNotes || 'No note added'}</dd></div>
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
              </div> : null}
            </article>
          )) : (
            <div className="invoice-preview-empty">
              No approved job sheets are visible yet. Accounts must approve the invoice before Production can see the order sheet.
            </div>
          )}
        </div>
        <footer className="production-register-footer">
          <span>Showing {filteredJobs.length ? 1 : 0} to {filteredJobs.length} of {productionJobs.length} jobs</span>
          <div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button><button>5 / page⌄</button></div>
        </footer>
      </section>
      <section className="production-workflow-panel">
        <header>Production Workflow</header>
        <div>{[
          ['✓', 'Payment Confirmed', 'Accounts confirms Paid or Partial Paid'],
          ['▤', 'Job Sheet Released', 'Order sheet sent to Production'],
          ['◇', 'Fabric Confirmed', 'Stock allocated or client fabric received'],
          ['♙', 'Assigned to Tailor', 'Job assigned and production begins'],
          ['✓', 'Quality Check', 'Reviewed and marked as ready'],
          ['⚑', 'Ready for Collection', 'Store notified for customer pickup'],
        ].map(([icon, label, detail]) => <article key={label}><i>{icon}</i><strong>{label}</strong><small>{detail}</small></article>)}</div>
      </section>
      </div>
      <aside className="production-dashboard-rail">
        <section className="production-rail-panel tailor-availability">
          <header><strong>Tailor Availability</strong><button>View all →</button></header>
          {(tailors.length ? tailors : [
            { id: 'p1', displayName: 'Peter Okon', tailorGrade: 'Senior', tailorDepartment: 'Bespoke' },
            { id: 'p2', displayName: 'Segun Adeyemi', tailorGrade: 'Intermediate', tailorDepartment: 'Native' },
            { id: 'p3', displayName: 'Musa Ibrahim', tailorGrade: 'Senior', tailorDepartment: 'Suits' },
            { id: 'p4', displayName: 'Daniel Chinedu', tailorGrade: 'Junior', tailorDepartment: 'General' },
          ]).slice(0, 4).map((tailor) => {
            const load = productionJobs.filter((job) => job.tailor === tailor.displayName && job.status !== 'Ready').length;
            return <article key={tailor.id}><i>{tailor.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><div><strong>{tailor.displayName}</strong><small>{tailor.tailorGrade || 'Tailor'} · {tailor.tailorDepartment || 'General'}</small><span style={{ '--load': `${Math.min(load * 20, 100)}%` }} /></div><b>{load} / 5 jobs</b></article>;
          })}
        </section>
        <section className="production-rail-panel inventory-alerts">
          <header><strong>Inventory Alerts</strong><button>View all →</button></header>
          {(inventory.filter((fabric) => toNumber(fabric.quantity) <= toNumber(fabric.lowStockThreshold || 5)).slice(0, 2).length
            ? inventory.filter((fabric) => toNumber(fabric.quantity) <= toNumber(fabric.lowStockThreshold || 5)).slice(0, 2)
            : [{ id: 'f1', name: 'Black Jacquard Wool', quantity: 1.5, unit: 'm' }, { id: 'f2', name: 'Shiffon (Green)', quantity: 3.2, unit: 'm' }]
          ).map((fabric, index) => <article className={index ? 'purple' : ''} key={fabric.id}><i>△</i><div><strong>{fabric.name}</strong><small>Low stock: {fabric.quantity}{fabric.unit} remaining</small></div><button>View Details</button></article>)}
        </section>
        <section className="production-rail-panel production-recent">
          <header><strong>Recent Activity</strong></header>
          {[...productionJobs].slice(0, 4).map((job) => <article key={job.id}><i>✓</i><span><strong>{job.customer}</strong> {job.status === 'Ready' ? 'marked as ready' : job.tailor !== 'Unassigned' ? `assigned to ${job.tailor}` : 'job sheet released'}</span><time>Today</time></article>)}
          {!productionJobs.length ? <p>No recent production activity.</p> : null}
        </section>
        <section className="production-rail-panel production-help"><header><strong>Need Help?</strong></header><div><button>Message Store Manager</button><button>◉ Send Message</button></div></section>
      </aside>
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

function AccountsReportsDashboard({ report, from, to, setFrom, setTo, exportFormat, setExportFormat, exportReport, message }) {
  const summary = report.summary;
  const paidTotal = report.invoices.filter((invoice) => invoice.paymentStatus === 'Fully Paid').reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const pending = report.invoices.filter((invoice) => invoice.approvalStatus === 'Pending Accounts');
  const flagged = report.invoices.filter((invoice) => ['Flagged', 'Rejected'].includes(invoice.approvalStatus));
  const partial = report.invoices.filter((invoice) => invoice.paymentStatus === 'Partial Paid');
  return <div className="accounts-reports">
    <section className="report-builder"><header>▤ &nbsp; Report Builder</header><div>{[['Period', <select key="period"><option>Last 30 Days</option><option>This Month</option></select>], ['Store', <select key="store"><option>All Stores</option></select>], ['Payment Status', <select key="pay"><option>All Payments</option><option>Fully Paid</option><option>Partial Paid</option></select>], ['Approval Status', <select key="approval"><option>All Statuses</option><option>Approved</option><option>Pending</option></select>], ['Group By', <select key="group"><option>None</option><option>Store</option><option>Customer</option></select>], ['Export Format', <select key="export" value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}><option value="csv">Excel (.xlsx)</option><option value="pdf">PDF</option></select>]].map(([label, control]) => <label key={label}>{label}{control}</label>)}</div><footer><label>From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)}/></label><label>To<input type="date" value={to} min={from} max={todayIso()} onChange={(event) => setTo(event.target.value)}/></label><button>Reset</button><button className="generate" onClick={exportReport}>Generate Report</button></footer>{message ? <p>{message}</p> : null}</section>
    <section className="report-kpis">{[
      ['Total Revenue', money.format(summary.totalInvoiced), '↑ 18.7% vs last 30 days', 'gold'],
      ['Total Invoices', summary.invoiceCount, '↑ 9.1% vs last 30 days', 'blue'],
      ['Paid Invoices', summary.fullyPaidCount, money.format(paidTotal), 'green'],
      ['Pending Approval', summary.pendingApprovalCount, money.format(pending.reduce((sum, item) => sum + toNumber(item.total), 0)), 'gold'],
      ['Rejected / Flagged', flagged.length, money.format(flagged.reduce((sum, item) => sum + toNumber(item.total), 0)), 'red'],
      ['Inventory Alerts', summary.lowStockCount, 'Requires attention', 'red'],
    ].map(([label, value, detail, tone]) => <article className={`report-kpi ${tone}`} key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small><div>{[25,38,30,52,42,60,45,70,58,75].map((height, i) => <i style={{height: `${height}%`}} key={i}/>)}</div></article>)}</section>
    <section className="report-chart-grid">
      <article className="report-chart-card"><header><h2>Revenue Trend</h2><select><option>Daily</option></select></header><div className="revenue-line-chart"><div>{[20,28,55,32,48,68,40,24,35,49,45,62,83,70].map((height, i) => <i style={{height: `${height}%`}} key={i}/>)}</div></div></article>
      <article className="report-chart-card"><header><h2>Payment Breakdown</h2></header><div className="report-donut payment"><span><strong>{summary.invoiceCount}</strong>Total</span></div><div className="report-legend">{[['Paid in Full', summary.fullyPaidCount, 'green'], ['Partial Paid', partial.length, 'gold'], ['Unpaid', Math.max(0, summary.invoiceCount-summary.fullyPaidCount-partial.length), 'blue'], ['Overdue', flagged.length, 'red']].map(([label,value,tone])=><p key={label}><i className={tone}/><span>{label}</span><strong>{value}</strong></p>)}</div></article>
      <article className="report-chart-card"><header><h2>Approval Status</h2></header><div className="report-donut approval"><span><strong>{summary.invoiceCount}</strong>Total</span></div><div className="report-legend">{[['Approved', summary.approvedCount, 'green'], ['Pending', summary.pendingApprovalCount, 'gold'], ['Rejected / Flagged', flagged.length, 'red']].map(([label,value,tone])=><p key={label}><i className={tone}/><span>{label}</span><strong>{value}</strong></p>)}</div></article>
    </section>
    <section className="report-insight-grid"><article className="report-table-card"><h2>Invoices Awaiting Approval</h2><table><thead><tr><th>Invoice</th><th>Customer</th><th>Store</th><th>Total</th><th>Payment</th><th>Action</th></tr></thead><tbody>{pending.slice(0,5).map(invoice=><tr key={invoice.invoiceNumber}><td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customer}</td><td>{invoice.store}</td><td>{money.format(invoice.total)}</td><td><Status>{invoice.paymentStatus}</Status></td><td>✓ &nbsp; × &nbsp; ⚑</td></tr>)}</tbody></table></article><article className="quick-insights"><h2>✦ &nbsp; Quick Insights</h2>{[`Revenue increased by 18.7% compared to the previous 30 days.`, `${pending.length} invoices are awaiting approval.`, `${flagged.length} invoices are overdue and need attention.`, `${report.allocations.length} fabric allocations recorded.`, `${summary.lowStockCount} inventory items are low or out of stock.`].map((text,i)=><p key={text}><i>{['↗','△','!','▤','△'][i]}</i>{text}</p>)}</article></section>
    <section className="commercial-report"><nav>{['Commercial Activity','Payments','Inventory Reconciliation','Store Performance','Exports'].map((tab,i)=><button className={i===0?'active':''} key={tab}>{tab}</button>)}</nav><header><div><h2>Commercial Activity</h2><p>Overview of invoices and orders within the selected period.</p></div><div><button>▽ Filters</button><button>⇩ Export</button></div></header><div className="table-wrap"><table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Store</th><th>Total</th><th>Payment</th><th>Approval</th><th>Order Status</th><th>Action</th></tr></thead><tbody>{report.invoices.slice(0,8).map(invoice=><tr key={invoice.invoiceNumber}><td>{new Date(invoice.date).toLocaleDateString('en-GB')}</td><td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customer}</td><td>{invoice.store}</td><td>{money.format(invoice.total)}</td><td><Status>{invoice.paymentStatus}</Status></td><td><Status>{invoice.approvalStatus}</Status></td><td><Status>{invoice.orderStatus}</Status></td><td><button>◉ View</button></td></tr>)}</tbody></table></div><footer>Showing 1 to {Math.min(8,report.invoices.length)} of {report.invoices.length} invoices</footer></section>
    <section className="report-summary-grid"><article className="report-table-card"><h2>Inventory Reconciliation Summary</h2><div className="mini-report-stats"><span><b>{summary.inventoryItemCount}</b>Total Items</span><span><b>{summary.allocationCount}</b>Allocated</span><span><b>{report.allocations.length}</b>Returned</span></div><table><thead><tr><th>Fabric</th><th>Allocated</th><th>Returned</th></tr></thead><tbody>{report.allocations.slice(0,5).map((item,i)=><tr key={i}><td>{item.fabricName}</td><td>{item.quantity} {item.unit}</td><td>—</td></tr>)}</tbody></table></article><article className="report-table-card"><h2>Store Performance</h2><table><thead><tr><th>Store</th><th>Revenue</th><th>Invoices</th></tr></thead><tbody>{report.storeBreakdown.map(store=><tr key={store.store}><td>{store.store}</td><td>{money.format(store.total)}</td><td>{store.invoices}</td></tr>)}</tbody></table></article><article className="report-table-card"><h2>Top Customers</h2><table><thead><tr><th>Customer</th><th>Revenue</th><th>Invoices</th></tr></thead><tbody>{report.invoices.slice(0,5).map(invoice=><tr key={invoice.invoiceNumber}><td>{invoice.customer}</td><td>{money.format(invoice.total)}</td><td>1</td></tr>)}</tbody></table></article></section>
    <section className="report-table-card recent-exports"><h2>Recent Exports</h2><table><thead><tr><th>Report Name</th><th>Type</th><th>Date Generated</th><th>Date Range</th><th>Format</th><th>Generated By</th><th>Action</th></tr></thead><tbody>{['Invoices & Orders','Inventory Reconciliation','Payment Summary'].map(name=><tr key={name}><td>{name}</td><td>Commercial Activity</td><td>{new Date().toLocaleString('en-GB')}</td><td>{from} – {to}</td><td>Excel</td><td>Funke</td><td><button onClick={exportReport}>⇩ Download</button></td></tr>)}</tbody></table></section>
  </div>;
}

function ReportsView({ role }) {
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
  if ((role === 'accounts' || role === 'owner') && report) return <AccountsReportsDashboard report={report} from={from} to={to} setFrom={setFrom} setTo={setTo} exportFormat={exportFormat} setExportFormat={setExportFormat} exportReport={exportReport} message={message} />;

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

function NotificationPanel({ role, currentRole }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest first');
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

  if (role === 'store_manager' || role === 'accounts') {
    const notificationCategory = (item) => {
      const text = `${item.channel || ''} ${item.message || ''}`.toLowerCase();
      if (role === 'accounts' && (text.includes('inventory') || text.includes('stock') || text.includes('reconcil'))) return 'Inventory';
      if (text.includes('invoice')) return 'Invoices';
      if (text.includes('payment') || text.includes('paid')) return 'Payments';
      if (text.includes('system') || text.includes('customer') || text.includes('maintenance')) return 'System';
      return role === 'accounts' ? 'Invoices' : 'Orders';
    };
    const categories = role === 'accounts'
      ? ['All', 'Unread', 'Invoices', 'Payments', 'Inventory', 'System']
      : ['All', 'Unread', 'Orders', 'Invoices', 'Payments', 'System'];
    const counts = Object.fromEntries(categories.map((name) => [name, name === 'All'
      ? items.length
      : name === 'Unread'
        ? items.filter((item) => !item.isRead).length
        : items.filter((item) => notificationCategory(item) === name).length]));
    const visibleItems = items
      .filter((item) => category === 'All' || (category === 'Unread' ? !item.isRead : notificationCategory(item) === category))
      .sort((a, b) => sortOrder === 'Newest first' ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt));
    const iconFor = (name) => ({ Orders: '✓', Invoices: '▤', Payments: '▣', Inventory: '◇', System: '⚙' }[name] || '♧');

    return (
      <section className="store-notifications">
        <header><div><span>Inbox</span><h2>You have {counts.Unread} unread notifications</h2></div><button type="button" onClick={markAllRead}>✓ &nbsp; Mark all as read</button></header>
        <div className="store-notification-filters">
          <nav>{categories.map((name) => <button type="button" className={category === name ? 'active' : ''} onClick={() => setCategory(name)} key={name}>{name} <span>{counts[name]}</span></button>)}</nav>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option>Newest first</option><option>Oldest first</option></select>
        </div>
        <div className="store-notification-list">
          {loading ? <div className="invoice-preview-empty">Loading notifications...</div> : visibleItems.length ? visibleItems.map((item) => {
            const itemCategory = notificationCategory(item);
            return <article className={item.isRead ? 'read' : 'unread'} key={item.id}>
              <i className="unread-dot"/><span className={`notification-type-icon type-${itemCategory.toLowerCase()}`}>{iconFor(itemCategory)}</span>
              <div><strong>{item.title || item.subject || item.message?.split(/[.!]/)[0] || 'Notification'}</strong><p>{item.message}</p></div>
              <b className={`notification-category type-${itemCategory.toLowerCase()}`}>{itemCategory === 'Orders' ? 'Order' : itemCategory === 'Payments' ? 'Payment' : itemCategory === 'Invoices' ? 'Invoice' : itemCategory}</b>
              <time>{new Date(item.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><button className="notification-more">⋮</button>
            </article>;
          }) : <div className="invoice-preview-empty">No notifications in this category.</div>}
        </div>
      </section>
    );
  }

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
          <a className="tracking-close tracking-action-link" href={`/c/${encodeURIComponent(token)}/profile`}>Go to my profile</a>
          <button type="button" className="tracking-profile-link" onClick={closeTrackingPage}>Back to tracking</button>
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

  const currentOrder = profile.invoices?.[0] || null;
  const measurements = profile.measurements || {};
  const details = profile.customerDetails || {};
  const purchaseGoal = 12;
  const spendGoal = 3000000;
  const spendProgress = Math.min(100, Math.round((toNumber(profile.totalSpend) / spendGoal) * 100));
  const purchaseProgress = Math.min(100, Math.round((toNumber(profile.totalOrders) / purchaseGoal) * 100));
  const savedStyles = (profile.invoices || []).flatMap((invoice) => invoice.styleImages || []).slice(0, 3);

  return (
    <main className="client-portal-shell">
      <aside className="client-portal-nav"><div className="brand-lockup tracking-brand"><div className="mark">TW</div><div><strong>TWIF</strong><span>The Way It Fits</span></div></div><nav>{[['⌂','Dashboard'],['▣','My Orders'],['▤','Invoices'],['⌕','Measurements'],['♙','Profile & Contacts'],['♧','Membership'],['⌖','Address Book'],['♡','Saved Styles'],['⚙','Preferences']].map(([icon,label],index)=><a className={index===0?'active':''} href={`#${label.toLowerCase().replaceAll(' ','-')}`} key={label}><i>{icon}</i>{label}</a>)}</nav><section><strong>Need help?</strong><small>Chat with us on WhatsApp</small><a href="https://wa.me/2347056336710">◉ &nbsp; Chat Now</a></section><a className="portal-logout" href={`/c/${encodeURIComponent(token)}`}>← &nbsp; Back to tracking</a></aside>
      <section className="client-portal-workspace"><header><div><span>Client Portal</span><strong>{profile.name}</strong></div><a href={`/c/${encodeURIComponent(token)}`}>← Tracking</a></header><div className="client-portal-welcome"><p>Welcome back,</p><h1>{profile.name}</h1><span>⌕ &nbsp; {profile.phone || 'Phone not added'} &nbsp;&nbsp;·&nbsp;&nbsp; ✉ &nbsp; {profile.email}</span></div>
        <div className="client-portal-dashboard">
          <main>
            <article className="client-current-order"><header><div><h2>Your Current Order</h2><strong>{currentOrder?.items?.map((item)=>item.description).join(', ') || 'No active order'}</strong><p>Order No. {currentOrder?.invoiceNumber || '—'} &nbsp; • &nbsp; {currentOrder?.items?.reduce((sum,item)=>sum+toNumber(item.quantity),0)||0} pieces &nbsp; • &nbsp; {currentOrder?.store || '—'} Store</p></div><Status>{currentOrder?.orderStatus || 'No order'}</Status></header><div className="client-order-progress"><i>1</i><span/><i>2</i><small>In Progress</small><small>Ready for Collection</small></div><dl><div><dt>Delivery Date</dt><dd>{currentOrder?.deliveryDate ? new Date(`${String(currentOrder.deliveryDate).slice(0,10)}T00:00:00`).toLocaleDateString('en-GB') : 'To be confirmed'}</dd></div><div><dt>Tailor</dt><dd>{currentOrder?.tailor || 'To be assigned'}</dd></div><div><dt>Fabric</dt><dd>{currentOrder?.fabric || 'To be confirmed'}</dd></div><div><dt>Style Images</dt><dd>{currentOrder?.styleImages?.length || 0} uploaded</dd></div></dl><a href="#order-history">View Order Details &nbsp;›</a></article>
            <section className="client-portal-triple" id="order-history"><article><header><h2>Order History</h2><span>View all</span></header>{profile.invoices.slice(0,4).map((invoice)=><div className="client-list-row" key={invoice.invoiceNumber}><span><small>{invoice.invoiceNumber}</small><strong>{invoice.items.map((item)=>item.description).join(', ')}</strong><small>{invoice.items.reduce((sum,item)=>sum+toNumber(item.quantity),0)} pieces &nbsp; • &nbsp; {invoice.store} Store</small></span><Status>{invoice.orderStatus}</Status></div>)}</article><article><header><h2>Invoices</h2><span>View all</span></header>{profile.invoices.slice(0,4).map((invoice)=><div className="client-list-row" key={invoice.invoiceNumber}><span><small>{invoice.invoiceNumber}</small><strong>{money.format(invoice.total)}</strong><small>{invoice.paymentStatus}</small></span><time>{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</time></div>)}</article><article><header><h2>Measurements</h2><span>View all</span></header><div className="client-measure-card"><i>⌁</i><strong>Your measurements</strong><p>{Object.keys(measurements).filter((key)=>key!=='profile').length ? 'We have your latest measurements saved.' : 'Measurements have not been saved yet.'}</p><button>View Measurements</button></div></article></section>
            <section className="client-portal-bottom"><article><header><h2>Contact Details</h2><span>Edit</span></header><p>⌕ &nbsp; {profile.phone || 'Not provided'}</p><p>✉ &nbsp; {profile.email}</p><p>⌖ &nbsp; {details.address || 'Address not provided'}</p></article><article><header><h2>Saved Styles</h2><span>View all</span></header><div className="client-saved-styles">{savedStyles.length ? savedStyles.map((image,index)=><img src={image.url || image.dataUrl || image} alt={`Saved style ${index+1}`} key={image.url || image.dataUrl || index}/>) : <p>Your saved style references will appear here.</p>}</div></article><article><header><h2>Address Book</h2><span>View all</span></header><p><strong>⌖ &nbsp; Home</strong><br/>{details.address || 'No saved address'}</p><p><strong>⌖ &nbsp; Preferred Store</strong><br/>{details.preferredStore || currentOrder?.store || 'Lekki'} Store</p></article></section>
          </main>
          <aside className="client-membership"><header>♕ &nbsp; Your membership — Regular</header><p>Here’s where you stand this year:</p><label>Spend <strong>{money.format(profile.totalSpend)} of {money.format(spendGoal)}</strong><span><i style={{width:`${spendProgress}%`}}/></span><b>{spendProgress}%</b></label><label>Purchases <strong>{profile.totalOrders} of {purchaseGoal}</strong><span><i style={{width:`${purchaseProgress}%`}}/></span><b>{purchaseProgress}%</b></label><p>You need both <strong>{money.format(Math.max(0,spendGoal-profile.totalSpend))}</strong> more in spend and <strong>{Math.max(0,purchaseGoal-profile.totalOrders)} more purchases</strong> to qualify for Elite membership.</p><a href="#membership">→ &nbsp; See Elite benefits</a></aside>
        </div>
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
  if (activeView === 'Overview') return <Overview role={role} currentRole={viewProps.currentRole} sentInvoices={viewProps.sentInvoices} productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} onApproveInvoice={viewProps.onApproveInvoice} />;
  if (activeView === 'Invoices') {
    if (role === 'store_manager') return <StoreInvoicesView sentInvoices={viewProps.sentInvoices} currentRole={viewProps.currentRole} onInvoiceSent={viewProps.onInvoiceSent} />;
    if (role === 'accounts' || role === 'owner') return <AccountsInvoicesPage sentInvoices={viewProps.sentInvoices} onApproveInvoice={viewProps.onApproveInvoice} />;
    return <OrdersView sentInvoices={viewProps.sentInvoices} />;
  }
  if (activeView === 'Orders') return role === 'store_manager' || role === 'owner' ? <StoreManagerOrdersPage sentInvoices={viewProps.sentInvoices} /> : <OrdersView sentInvoices={viewProps.sentInvoices} />;
  if (activeView === 'Customers') return role === 'store_manager' || role === 'owner' ? <StoreManagerCustomersPage sentInvoices={viewProps.sentInvoices} /> : <CustomersView />;
  if (activeView === 'New Invoice') return <NewInvoiceView currentRole={viewProps.currentRole} onInvoiceSent={viewProps.onInvoiceSent} />;
  if (activeView === 'Order Sheet') return <OrderSheetView sentInvoices={viewProps.sentInvoices} onCreateJob={viewProps.onCreateJob} />;
  if (activeView === 'Payments') return role === 'accounts' || role === 'owner'
    ? <AccountsPaymentsPage sentInvoices={viewProps.sentInvoices} />
    : <PaymentsView sentInvoices={viewProps.sentInvoices} onApproveInvoice={viewProps.onApproveInvoice} />;
  if (activeView === 'Production') return <ProductionView productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Inventory') return role === 'accounts' ? <AccountsInventoryReconciliationPage /> : role === 'inventory_manager' ? <InventoryListPage currentRole={viewProps.currentRole} /> : role === 'owner' ? <InventoryListPage currentRole={viewProps.currentRole} ownerMode /> : <InventoryView />;
  if (activeView === 'Reconciliations') return <InventoryView />;
  if (activeView === 'Staff') return <StaffView role={role} currentRole={viewProps.currentRole} />;
  if (activeView === 'Tailors & Staff') return <StaffView role={role} currentRole={viewProps.currentRole} />;
  if (activeView === 'User Management') return <UserManagementPage currentRole={viewProps.currentRole} />;
  if (activeView === 'Stores') return <OwnerStoresPage sentInvoices={viewProps.sentInvoices} />;
  if (activeView === 'Reports') return <ReportsView role={role} />;
  if (activeView === 'My Tasks') return <MyTasksPage currentRole={viewProps.currentRole} productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'Weekly Log') return <WeeklyLogPage currentRole={viewProps.currentRole} productionJobs={viewProps.productionJobs} />;
  if (activeView === 'Notifications') return <NotificationPanel role={role} currentRole={viewProps.currentRole} />;
  return <Overview role={role} />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const restoredSession = useMemo(sessionFromStorage, []);
  const [role, setRole] = useState(restoredSession?.role || null);
  const visibleNav = navByRole[role];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [sentInvoices, setSentInvoices] = useState([]);
  const [productionJobs, setProductionJobs] = useState([]);
  const [signedInAccount, setSignedInAccount] = useState(restoredSession);
  const [staffProfile, setStaffProfile] = useState(null);
  const signedIn = Boolean(role && signedInAccount);
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const requestedViewSlug = pathSegments[0] === roleSlug(role) ? pathSegments[1] : '';
  const activeView = visibleNav?.find((item) => viewSlug(item) === requestedViewSlug)
    || (requestedViewSlug === 'portal-preview' ? 'Portal Preview' : visibleNav?.[0] || 'Overview');

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

  useEffect(() => {
    if (!signedIn || location.pathname.startsWith('/c/')) return;
    const basePath = `/${roleSlug(role)}`;
    const validSlugs = new Set([...(visibleNav || []).map(viewSlug), 'portal-preview']);
    const isAuthOrRoot = ['/', '/login', '/register', '/registration-success'].includes(location.pathname);
    const hasCorrectRole = location.pathname === basePath || location.pathname.startsWith(`${basePath}/`);
    if (isAuthOrRoot || !hasCorrectRole || !validSlugs.has(pathSegments[1])) {
      navigate(`${basePath}/${viewSlug(visibleNav?.[0] || 'Overview')}`, { replace: true });
    }
  }, [signedIn, role, location.pathname, navigate, visibleNav]);

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
    window.localStorage.setItem(OMS_SESSION_KEY, JSON.stringify({ role: account.role, phone: account.phone, label: account.label }));
    setMobileMenuOpen(false);
    navigate(`/${roleSlug(account.role)}/${viewSlug(navByRole[account.role][0])}`, { replace: true });
  };

  const handleLogout = () => {
    window.localStorage.removeItem(OMS_SESSION_KEY);
    setRole(null);
    setSignedInAccount(null);
    setStaffProfile(null);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const openView = (view) => {
    setMobileMenuOpen(false);
    navigate(`/${roleSlug(role)}/${viewSlug(view)}`);
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
    if (location.pathname !== '/login') return <Navigate to="/login" replace />;
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className={classNames('app-shell', mobileMenuOpen && 'menu-open', role === 'production_manager' && 'production-role-shell', role === 'accounts' && 'accounts-role-shell', role === 'store_manager' && 'store-role-shell', role === 'owner' && 'owner-role-shell', role === 'tailor' && 'tailor-role-shell')}>
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
            <NavLink
              className={({ isActive }) => isActive ? 'active' : ''}
              key={item}
              to={`/${roleSlug(role)}/${viewSlug(item)}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item}
            </NavLink>
          ))}
        </nav>
        {role === 'production_manager' ? (
          <div className="production-shortcuts">
            <span>Shortcuts</span>
            {['Active Jobs', 'Assign Tailor', 'Fabric Allocation', 'Production Notes'].map((item, index) => (
              <button type="button" key={item} onClick={() => openView('Production')}><i>{['◇', '♙', '▣', '▤'][index]}</i>{item}</button>
            ))}
          </div>
        ) : null}
        {role === 'accounts' ? <div className="accounts-sidebar-help"><strong>Need help?</strong><span>Chat with support</span><button type="button">◉ &nbsp; Start Chat</button></div> : null}
        <Link className="portal-link" to={`/${roleSlug(role)}/portal-preview`} onClick={() => setMobileMenuOpen(false)}>Portal Preview</Link>
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
            <h1>{activeView === 'Portal Preview' ? 'Customer Tracking Preview' : role === 'accounts' && activeView === 'Overview' ? 'Account Dashboard' : role === 'accounts' && activeView === 'Inventory' ? 'Inventory Reconciliation' : role === 'inventory_manager' && activeView === 'Overview' ? 'Inventory Dashboard' : (role === 'inventory_manager' || role === 'owner') && activeView === 'Inventory' ? 'Inventory List' : activeView}</h1>
            {role === 'production_manager' && activeView === 'Production' ? <p className="topbar-subtitle">Manage active jobs, assign tailors, confirm fabric and track production progress.</p> : null}
            {role === 'accounts' && activeView === 'Overview' ? <p className="topbar-subtitle">Review, approve and reconcile with confidence.</p> : null}
            {role === 'accounts' && activeView === 'Invoices' ? <p className="topbar-subtitle">Review, approve and manage customer invoices before they enter production.</p> : null}
            {role === 'accounts' && activeView === 'Payments' ? <p className="topbar-subtitle">Track and manage all payments received across stores.</p> : null}
            {role === 'accounts' && activeView === 'Inventory' ? <p className="topbar-subtitle">Reconcile fabric allocations, deductions and adjustments across all stores.</p> : null}
            {role === 'inventory_manager' && activeView === 'Overview' ? <p className="topbar-subtitle">Monitor stock levels, allocate fabrics and receive deliveries.</p> : null}
            {role === 'inventory_manager' && activeView === 'Inventory' ? <p className="topbar-subtitle">View and manage all fabrics in stock.</p> : null}
            {role === 'owner' && activeView === 'Inventory' ? <p className="topbar-subtitle">View inventory and review requested stock changes.</p> : null}
            {role === 'store_manager' && activeView === 'Orders' ? <p className="topbar-subtitle">Manage and track all invoices and order sheets.</p> : null}
            {role === 'store_manager' && activeView === 'Invoices' ? <p className="topbar-subtitle">View sent invoices, monitor approvals and create new invoices.</p> : null}
            {role === 'owner' && activeView === 'Overview' ? <p className="topbar-subtitle">Real-time summary of your business performance and activity.</p> : null}
            {role === 'tailor' && activeView === 'My Tasks' ? <p className="topbar-subtitle">Jobs assigned to you. Start work and mark ready when done.</p> : null}
            {role === 'tailor' && activeView === 'Weekly Log' ? <p className="topbar-subtitle">Track your completed work and view your weekly performance.</p> : null}
            {role === 'store_manager' && activeView === 'Overview' ? <p className="topbar-subtitle">Good morning, {currentRole?.name?.split(' (')[0] || 'Store Manager'}! Here’s what’s happening in your store today.</p> : null}
            {role === 'store_manager' && activeView === 'Customers' ? <p className="topbar-subtitle">Manage customer profiles and create new orders.</p> : null}
          </div>
          <div className="topbar-actions">
            <NotificationBell role={role} currentRole={currentRole} onOpen={() => openView('Notifications')} />
            <div className="user-chip" ref={userMenuRef}>
              <ProfilePhotoControl
                account={currentRole}
                onProfileImageChange={(profileImageUrl) => setStaffProfile((current) => ({ ...current, profileImageUrl }))}
              />
              <span className="user-identity"><strong>{currentRole?.name?.split(' (')[0]}</strong><small>{accountTypeByRole[role]?.short || currentRole?.label}</small></span>
              <button className="user-menu-button" onClick={() => setUserMenuOpen((prev) => !prev)} aria-label="Open account menu" aria-expanded={userMenuOpen}>⌄</button>
              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <button type="button" onClick={handleLogout}>← &nbsp; Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <Routes>
          {(visibleNav || []).map((view) => (
            <Route
              key={view}
              path={`/${roleSlug(role)}/${viewSlug(view)}/*`}
              element={renderView(view, role, {
                currentRole,
                onInvoiceSent: recordSentInvoice,
                onApproveInvoice: updateInvoiceApproval,
                sentInvoices,
                productionJobs: approvedProductionJobs,
                onCreateJob: createProductionJob,
                onUpdateJob: updateProductionJob,
              })}
            />
          ))}
          <Route path={`/${roleSlug(role)}/portal-preview`} element={<PortalPreview />} />
          <Route path="*" element={<Navigate to={`/${roleSlug(role)}/${viewSlug(visibleNav?.[0] || 'Overview')}`} replace />} />
        </Routes>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {visibleNav.slice(0, 4).map((item, index) => (
          <NavLink key={item} to={`/${roleSlug(role)}/${viewSlug(item)}`} onClick={() => setMobileMenuOpen(false)}>
            <i aria-hidden="true">{['⌂', '▤', '♙', '◇'][index]}</i>
            <span>{item.length > 12 ? item.split(' ')[0] : item}</span>
          </NavLink>
        ))}
        <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open all navigation">
          <i aria-hidden="true">•••</i><span>More</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
