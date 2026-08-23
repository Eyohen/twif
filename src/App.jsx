import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, LayoutDashboard, Package, Users, FileText, CreditCard, Factory, Boxes, Bell, BarChart2, Settings as Settings2, ClipboardList, CheckSquare, Calendar, Users2, UserCog, Building2, Star, Download, TrendingUp, TrendingDown, ArrowRight, PieChart, AlertTriangle, AlertCircle, CheckCircle, Clock, DollarSign, BarChart, Activity, Filter, RefreshCw, MessageCircle, MapPin, Phone, Edit2, Trash2, Plus, Store, ShoppingCart, MoreHorizontal, Search, Eye, ArrowLeft, ChevronRight, Tag, Scissors, Ruler, Award, Camera, Image } from 'lucide-react';
import { api, getStoredAccessToken, setStoredAccessToken } from './lib/api';
import LoginPage from './pages/auth/LoginPage';
import MyTasksPage from './pages/tailor/MyTasksPage';
import WeeklyLogPage from './pages/tailor/WeeklyLogPage';
import TailorReportsPage from './pages/production/TailorReportsPage';
import StoreManagerOverviewPage from './pages/store-manager/OverviewPage';
import StoreManagerCustomersPage from './pages/store-manager/CustomersPage';
import StoreManagerOrdersPage from './pages/store-manager/OrdersPage';
import AccountsInvoicesPage from './pages/accounts/InvoicesPage';
import AccountsPaymentsPage from './pages/accounts/PaymentsPage';
import AccountsInventoryReconciliationPage from './pages/accounts/InventoryReconciliationPage';
import UserManagementPage from './pages/owner/UserManagementPage';
import MembershipsPage from './pages/owner/MembershipsPage';
import SettingsPage from './pages/owner/SettingsPage';
import ShopifySyncPage from './pages/owner/ShopifySyncPage';
import InventoryManagerOverviewPage from './pages/inventory/OverviewPage';
import InventoryListPage from './pages/inventory/InventoryListPage';
import { roles, inventoryCategories, navByRole, accountTypeByRole } from './config/oms';
import { Stat, Status, SectionHeader } from './components/oms/Common';
import useLabelledTables from './hooks/useLabelledTables';
import useCarouselIndicators from './hooks/useCarouselIndicators';
import InvoiceActionConfirmModal from './components/oms/InvoiceActionConfirmModal';
import JobCommentThread from './components/oms/JobCommentThread';
import {
  money, todayIso, invoiceSeed, invoiceItemSeed, trackingTokenSeed, toNumber,
  dateInputValue, customerStatus, paymentStatusLabels, invoiceApprovalStatus,
  isInvoiceApproved, canShowJobInProduction, productionBlockReason, productionJobFromInvoice,
  mergeJobsByInvoice, classNames, isAwaitingPayment, isFullyPaid, DEFAULT_RELEASE_PERCENT,
  worksOnJob, jobTailors, averageScore,
  invoiceDocumentPayload, PERIOD_OPTIONS, filterByPeriod, periodTrend, addDaysIso, isEliteCustomer,
  periodWindow, previousWindow, withinWindow, changeAgainst, changeLabel, LOG_PERIODS,
  amountReceived, invoicePayable, formatMoment, CUSTOMER_TRACKING_STEPS,
  openDocumentTab, presentInvoiceDocument, downloadInvoicePdf as saveInvoicePdf,
  useStores,
  useDepartments,
} from './utils/oms';
import { DEPARTMENT_FIELDS } from './config/departmentFields';

const trackingBaseUrl = (
  import.meta.env.VITE_TRACKING_BASE_URL ||
  window.location.origin ||
  'http://localhost:5173'
).replace(/\/+$/, '');

const trackingUrlForToken = (token) => `${trackingBaseUrl}/c/${token}`;
const OMS_SESSION_KEY = 'twif_oms_session';
const roleSlug = (value = '') => String(value || '').replaceAll('_', '-');
const viewSlug = (value = '') => String(value || '').toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
// Sessions are persistent by design, but the scope requires re-authentication
// after 8 hours idle so an unattended shop-floor device cannot be picked up
// and used. Stored alongside the session so it survives a reload or a device
// being locked overnight.
const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVE_KEY = 'twif_oms_last_active';

const readLastActive = () => {
  const stored = Number(window.localStorage.getItem(LAST_ACTIVE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
};

const markActive = () => window.localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));

const clearSessionStorage = () => {
  window.localStorage.removeItem(OMS_SESSION_KEY);
  window.localStorage.removeItem(LAST_ACTIVE_KEY);
  // The token is what actually opens the API, so signing out has to drop it.
  setStoredAccessToken(null);
};

// Set when a stored session is discarded for being stale, so the login screen
// can say why. Read once at start-up.
let sessionExpiredOnLoad = false;
const expiredOnLoad = () => sessionExpiredOnLoad;

const sessionFromStorage = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(OMS_SESSION_KEY) || 'null');
    if (!saved?.role || !navByRole[saved.role]) return null;

    // An unknown last-active stamp is treated as expired rather than trusted.
    const lastActive = readLastActive();
    if (!lastActive || Date.now() - lastActive > IDLE_LIMIT_MS) {
      clearSessionStorage();
      sessionExpiredOnLoad = true;
      return null;
    }

    // What is in storage is only a hint for the first paint — the token is what
    // actually grants anything, and the server is asked who the caller is as
    // soon as the app mounts.
    if (!getStoredAccessToken()) {
      clearSessionStorage();
      return null;
    }

    const roleDetails = roles.find((item) => item.id === saved.role);
    return { ...roleDetails, ...saved };
  } catch {
    return null;
  }
};


const NAV_ICONS = {
  Overview: LayoutDashboard,
  Orders: Package,
  Customers: Users,
  Invoices: FileText,
  Payments: CreditCard,
  Production: Factory,
  Inventory: Boxes,
  Notifications: Bell,
  Reports: BarChart2,
  Settings: Settings2,
  'Order Sheet': ClipboardList,
  'My Tasks': CheckSquare,
  'My Log': Calendar,
  'Tailor List': Users2,
  'Tailor Performance': Award,
  Staff: Users2,
  'Tailors & Staff': Users2,
  'User Management': UserCog,
  Stores: Building2,
  Memberships: Star,
  'Shopify Sync': RefreshCw,
};

function Overview({ role, currentRole, sentInvoices = [], productionJobs = [], onUpdateJob, onApproveInvoice, onNavigate }) {
  const isTailor = role === 'tailor';

  if (isTailor) {
    return <TailorOverview currentRole={currentRole} productionJobs={productionJobs} onUpdateJob={onUpdateJob} />;
  }

  if (role === 'inventory_manager') return <InventoryManagerOverviewPage onNavigate={onNavigate} />;

  if (role === 'production_manager') {
    return <ProductionOverview productionJobs={productionJobs} />;
  }

  if (role === 'owner') {
    return <OwnerOverview sentInvoices={sentInvoices} productionJobs={productionJobs} onNavigate={onNavigate} />;
  }

  if (role === 'accounts') {
    return <AccountsOverview sentInvoices={sentInvoices} onApproveInvoice={onApproveInvoice} onNavigate={onNavigate} />;
  }

  if (role === 'store_manager') {
    return <StoreManagerOverviewPage sentInvoices={sentInvoices} productionJobs={productionJobs} onNavigate={onNavigate} />;
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

function AccountsOverview({ sentInvoices = [], onApproveInvoice, onNavigate }) {
  const [inventory, setInventory] = useState([]);
  const [pendingInvoiceAction, setPendingInvoiceAction] = useState(null);
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);
  const KPI_COUNT = 6;
  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

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
      <div className="kpi-carousel-wrap">
        <section className="accounts-kpis" ref={kpiScrollRef} onScroll={handleKpiScroll}>
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
      </div>

      <section className="accounts-primary-grid">
        <section className="accounts-panel invoice-review">
          <header><div><h2>Invoice Review Queue</h2><p>Invoices awaiting your action.</p></div><button onClick={() => onNavigate?.('Invoices')}>View all invoices →</button></header>
          <div className="accounts-table-wrap">
            <table><thead><tr><th>Invoice</th><th>Customer</th><th>Store</th><th>Total</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead>
            <tbody>{queue.map((invoice) => <tr key={invoice.invoiceNumber}>
              <td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customer}</td><td>{invoice.store}</td><td><strong>{money.format(invoice.total)}</strong></td>
              <td><Status>{invoice.orderStatus || 'Unpaid'}</Status></td><td><Status>{invoice.paymentStatus}</Status></td>
              <td><div className="accounts-row-actions"><button title="Approve" onClick={() => setPendingInvoiceAction({ invoice, status: 'Approved' })}>✓</button><button title="Reject" onClick={() => setPendingInvoiceAction({ invoice, status: 'Rejected' })}>×</button><button title="Flag" onClick={() => setPendingInvoiceAction({ invoice, status: 'Flagged' })}>⚑</button><button title="Open full invoice" onClick={() => onNavigate?.('Invoices', { review: invoice.invoiceNumber })}>•••</button></div></td>
            </tr>)}</tbody></table>
            {!queue.length ? <div className="accounts-empty">No invoices are awaiting review.</div> : null}
          </div>
          <footer style={{cursor:'pointer'}} onClick={() => onNavigate?.('Invoices')}>View full queue →</footer>
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
        </div><footer style={{cursor:'pointer'}} onClick={() => onNavigate?.('Inventory')}>View inventory →</footer></section>

        <section className="accounts-panel recent-alerts"><header><h2>Recent Inventory Alerts</h2><button onClick={() => onNavigate?.('Inventory')}>View all alerts →</button></header><div>
          {(lowStock.length ? lowStock : [{ id: 'a1', name: 'Satin Fabric (Black)', type: 'Fabrics', quantity: 4.2, unit: 'yards' }, { id: 'a2', name: 'Buttons (Metal)', type: 'Accessories', quantity: 8, unit: 'sets' }, { id: 'a3', name: 'Thread (Black)', type: 'Accessories', quantity: 0, unit: '' }]).slice(0, 5).map((item) => <article key={item.id}><i className={toNumber(item.quantity) <= 0 ? 'red' : ''}/><strong>{item.name}</strong><span>{item.type}</span><small className={toNumber(item.quantity) <= 0 ? 'red' : ''}>{toNumber(item.quantity) <= 0 ? 'Out of stock' : `${item.quantity} ${item.unit} left`}</small></article>)}
        </div></section>
      </section>

      <section className="accounts-panel accounts-activity"><header><h2>Recent Activity</h2></header><div>
        {sentInvoices.slice(0, 5).map((invoice, index) => <article key={invoice.invoiceNumber}><i>{['✓', '▣', '⚑', '◇', '▤'][index]}</i><span><strong>{invoice.invoiceNumber} {invoiceApprovalStatus(invoice).toLowerCase()}</strong><small>by Funke</small><time>{invoice.createdAtLabel || formatMoment(invoice.createdAt)}</time></span></article>)}
        {!sentInvoices.length ? <div className="accounts-empty">Account activity will appear here.</div> : null}
        <button onClick={() => onNavigate?.('Invoices')}>View full activity →</button>
      </div></section>
      {pendingInvoiceAction && <InvoiceActionConfirmModal
        invoice={pendingInvoiceAction.invoice}
        status={pendingInvoiceAction.status}
        onCancel={() => setPendingInvoiceAction(null)}
        onConfirm={() => {
          onApproveInvoice?.(pendingInvoiceAction.invoice.invoiceNumber, pendingInvoiceAction.status);
          setPendingInvoiceAction(null);
        }}
      />}
    </div>
  );
}

function OwnerOverview({ sentInvoices = [], productionJobs = [], onNavigate }) {
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [period, setPeriod] = useState('today');
  const [salesPeriod, setSalesPeriod] = useState('month');
  const [productionPeriod, setProductionPeriod] = useState('week');
  const [storePeriod, setStorePeriod] = useState('month');
  // Top customers were ranked on lifetime spend under a heading that said "this
  // month", with "Recently" printed for every last order. It reads over a real
  // period now, with the period on the panel.
  const [customerPeriod, setCustomerPeriod] = useState('month');
  const [customerFrom, setCustomerFrom] = useState('');
  const [customerTo, setCustomerTo] = useState(todayIso());
  // Custom used to start with no From date, and filterByPeriod passes every
  // record through until one is set — so picking Custom appeared to do nothing.
  // It opens on the start of this month, which the reader can then move.
  const [customFrom, setCustomFrom] = useState(() => `${todayIso().slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(todayIso());
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);
  const OWNER_KPI_COUNT = 6;
  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / OWNER_KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

  useEffect(() => {
    Promise.allSettled([api.get('/oms/fabrics'), api.get('/oms/customers'), api.get('/oms/staff')]).then(([fabricsResult, customersResult, staffResult]) => {
      if (fabricsResult.status === 'fulfilled') setInventory(fabricsResult.value.data?.data?.fabrics || []);
      if (customersResult.status === 'fulfilled') setCustomers(customersResult.value.data?.data?.customers || []);
      if (staffResult.status === 'fulfilled') setStaff(staffResult.value.data?.data?.staffUsers || []);
    });
  }, []);

  const filteredInvoices = useMemo(
    () => filterByPeriod(sentInvoices, (invoice) => invoice.createdAt, period, customFrom, customTo),
    [sentInvoices, period, customFrom, customTo]
  );

  // Each panel filters on its own, because a control that sits inside a panel
  // reads as belonging to that panel. They were fixed labels over a select
  // with a single option and no handler, so nothing happened when used.
  const salesInvoices = useMemo(
    () => filterByPeriod(sentInvoices, (invoice) => invoice.createdAt, salesPeriod),
    [sentInvoices, salesPeriod]
  );
  const storeInvoices = useMemo(
    () => filterByPeriod(sentInvoices, (invoice) => invoice.createdAt, storePeriod),
    [sentInvoices, storePeriod]
  );
  // Jobs carry no created date, so their most recent activity stands in.
  const periodJobs = useMemo(
    () => filterByPeriod(productionJobs, (job) => job.updatedAt || job.assignedAt, productionPeriod),
    [productionJobs, productionPeriod]
  );

  const salesRevenue = salesInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const salesTrend = periodTrend(salesInvoices, salesPeriod);
  const periodCompleted = periodJobs.filter((job) => job.status === 'Ready');
  const periodInProgress = periodJobs.filter((job) => ['Assigned', 'In Progress'].includes(job.status));
  const periodPending = periodJobs.filter((job) => job.status === 'Order Sheet Confirmed');
  const periodDelayed = periodJobs.filter((job) => job.delivery && new Date(`${job.delivery}T23:59:59`) < new Date() && job.status !== 'Ready');

  const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

  // The same window, one length earlier, so each headline figure can be set
  // against something real rather than a number typed into the source.
  const thisWindow = periodWindow(period, customFrom, customTo);
  const lastWindow = previousWindow(thisWindow);
  const priorInvoices = withinWindow(sentInvoices, (invoice) => invoice.createdAt, lastWindow);
  const priorRevenue = priorInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const priorCompleted = withinWindow(productionJobs, (job) => job.updatedAt, lastWindow).filter((job) => job.status === 'Ready');
  const nowCompleted = withinWindow(productionJobs, (job) => job.updatedAt, thisWindow).filter((job) => job.status === 'Ready');
  const revenueChange = changeAgainst(totalRevenue, priorRevenue);
  const completed = productionJobs.filter((job) => job.status === 'Ready');
  // Overdue jobs are a standing concern, so this one is measured across the
  // whole board rather than the selected period.
  const delayed = productionJobs.filter((job) => job.delivery && new Date(`${job.delivery}T23:59:59`) < new Date() && job.status !== 'Ready');
  const lowStock = inventory.filter((item) => toNumber(item.quantity) <= toNumber(item.lowStockThreshold || 5));
  const outstanding = filteredInvoices.filter((invoice) => invoice.paymentStatus !== 'Fully Paid').reduce((sum, invoice) => sum + Math.max(0, toNumber(invoice.total) - toNumber(invoice.paid)), 0);
  const storeRows = ['Lekki', 'Ikeja', 'Surulere'].map((store) => {
    const rowInvoices = storeInvoices.filter((invoice) => String(invoice.store).toLowerCase().includes(store.toLowerCase()));
    return { store, revenue: rowInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0), orders: rowInvoices.length };
  });
  const storeRevenue = storeRows.reduce((sum, row) => sum + row.revenue, 0);
  // Ranked on what they actually spent in the period on screen, from the
  // invoices raised against them.
  const customerWindow = periodWindow(customerPeriod === 'custom' && !customerFrom ? 'month' : customerPeriod, customerFrom, customerTo);
  const topCustomers = useMemo(() => {
    const inWindow = customerWindow
      ? withinWindow(sentInvoices, (invoice) => invoice.createdAt, customerWindow)
      : sentInvoices;
    const totals = new Map();
    inWindow.forEach((invoice) => {
      const name = invoice.customer || 'Unnamed';
      const entry = totals.get(name) || { id: name, fullName: name, spend: 0, orders: 0, lastOrder: null };
      entry.spend += toNumber(invoice.total);
      entry.orders += 1;
      const at = invoice.createdAt ? new Date(invoice.createdAt) : null;
      if (at && (!entry.lastOrder || at > entry.lastOrder)) entry.lastOrder = at;
      totals.set(name, entry);
    });
    return [...totals.values()].sort((a, b) => b.spend - a.spend).slice(0, 5);
  }, [sentInvoices, customerWindow]);
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
      <div className="kpi-carousel-wrap">
        <section className="owner-kpis" ref={kpiScrollRef} onScroll={handleKpiScroll}>{[
          // A caption only appears where there is an earlier window to measure
          // against; the last three are counts of how things stand today, which
          // nothing in the period before them speaks to.
          ['Total Revenue', money.format(totalRevenue), changeLabel(revenueChange) || 'No earlier period to compare', 'gold', '▣'],
          ['Total Orders', filteredInvoices.length, changeLabel(changeAgainst(filteredInvoices.length, priorInvoices.length)) || 'No earlier period to compare', 'gold', '▤'],
          ['Completed Jobs', completed.length, changeLabel(changeAgainst(nowCompleted.length, priorCompleted.length)) || `${nowCompleted.length} in this period`, 'green', '▥'],
          ['Active Customers', customers.length, 'On the books now', 'blue', '♙'],
          ['Low Stock Items', lowStock.length, lowStock.length ? 'At or below threshold' : 'Nothing below threshold', 'red', '△'],
          ['Outstanding Payments', money.format(outstanding), `${filteredInvoices.filter((invoice) => invoice.paymentStatus !== 'Fully Paid').length} invoices not settled`, 'red', '▣'],
        ].map(([label, value, change, tone, icon], index) => <article className={`owner-kpi tone-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><small>{change}</small><i>{icon}</i>{index < 5 ? <div className="owner-sparkline"><b/><b/><b/><b/><b/><b/><b/></div> : null}</article>)}</section>
      </div>

      <section className="owner-action-row">
        <section className="owner-panel action-insights"><header>Action Insights</header><div>
          {[
            ['▤', `${filteredInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts').length} invoices are awaiting Accounts approval.`, 'Review', 'gold', 'Invoices'],
            ['△', `${delayed.length} orders are overdue by more than 2 days.`, 'View', 'red', 'Orders'],
            ['△', `${lowStock[0]?.name || 'Inventory'} requires restocking.`, 'Restock', 'blue', 'Inventory'],
            [revenueChange && !revenueChange.up ? '↘' : '↗',
              revenueChange
                ? `Revenue is ${revenueChange.up ? 'up' : 'down'} ${Math.abs(revenueChange.percent).toFixed(1)}% on the period before.`
                : 'There is no earlier period to compare revenue against yet.',
              'View Report', revenueChange && !revenueChange.up ? 'red' : 'green', 'Reports'],
            ['♙', `${topCustomers[0]?.fullName || 'A customer'} is a top customer this month.`, 'View Customer', 'blue', 'Customers'],
            ['♧', `${tailorRows[0]?.displayName || 'Production staff'} leads weekly production.`, 'View Performance', 'purple', 'Staff'],
          ].map(([icon, text, action, tone, dest]) => <article key={text}><i className={tone}>{icon}</i><span>{text}</span><button className={tone} onClick={() => onNavigate?.(dest)}>{action}</button></article>)}
        </div><footer style={{cursor:'pointer'}} onClick={() => onNavigate?.('Reports')}>View all insights &nbsp; →</footer></section>
      </section>

      <section className="owner-analytics-grid">
        <section className="owner-panel sales-overview">
          <header>
            <span>Sales Overview</span>
            <select value={salesPeriod} onChange={(event) => setSalesPeriod(event.target.value)} aria-label="Sales period">
              {PERIOD_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </header>
          <div className="sales-chart">
            <div className="chart-bars">
              {salesTrend.map((point, index) => (
                <i style={{ height: `${point.height}%` }} key={index} title={money.format(point.value)} />
              ))}
            </div>
          </div>
          <footer>{[
            [money.format(salesRevenue), 'Total Revenue'],
            [salesInvoices.length, 'Total Orders'],
            [salesInvoices.length ? money.format(salesRevenue / salesInvoices.length) : money.format(0), 'Avg. Order Value'],
            [`${salesInvoices.filter((invoice) => isFullyPaid(invoice)).length}/${salesInvoices.length}`, 'Fully Paid'],
          ].map(([value, label]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</footer>
        </section>
        <section className="owner-panel owner-production">
          <header>
            <span>Production Overview</span>
            <select value={productionPeriod} onChange={(event) => setProductionPeriod(event.target.value)} aria-label="Production period">
              {PERIOD_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </header>
          <div>
            <div className="owner-production-donut"><span><strong>{periodJobs.length}</strong>Total Jobs</span></div>
            <div>{[
              // Named for the state it counts: Ready is where a job ends.
              ['Ready', periodCompleted.length, 'green'],
              ['In Progress', periodInProgress.length, 'gold'],
              ['Pending', periodPending.length, 'blue'],
              ['Delayed', periodDelayed.length, 'red'],
            ].map(([label, value, tone]) => <article key={label}><i className={tone}/><span>{label}</span><strong>{value}</strong></article>)}</div>
          </div>
          <footer>
            <div><strong>{periodCompleted.length}</strong><small>Ready for Collection</small></div>
            <div><strong className="red">{periodDelayed.length}</strong><small>Delayed Jobs</small></div>
            <div><strong className="green">{periodJobs.length ? Math.round((periodCompleted.length / periodJobs.length) * 100) : 0}%</strong><small>Completion Rate</small></div>
          </footer>
        </section>
        <section className="owner-panel store-performance">
          <header>
            <span>Store Performance</span>
            <select value={storePeriod} onChange={(event) => setStorePeriod(event.target.value)} aria-label="Store performance period">
              {PERIOD_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </header>
          <table>
            <thead><tr><th>Store</th><th>Revenue</th><th>Orders</th><th>% Revenue</th><th>Status</th></tr></thead>
            <tbody>{storeRows.map((row) => {
              const share = storeRevenue ? Math.round((row.revenue / storeRevenue) * 100) : 0;
              // Ranked on the actual share rather than row order, so the
              // labels stay true when the period changes.
              const tone = share >= 40 ? 'green' : share >= 15 ? 'gold' : 'red';
              const label = share >= 40 ? 'Excellent' : share >= 15 ? 'Average' : 'Needs Attention';
              return (
                <tr key={row.store}>
                  <td>{row.store}</td>
                  <td>{money.format(row.revenue)}</td>
                  <td>{row.orders}</td>
                  <td>{share}%</td>
                  <td><i className={tone}/>{label}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <footer style={{cursor:'pointer'}} onClick={() => onNavigate?.('Stores')}>View all stores &nbsp; →</footer>
        </section>
      </section>

      <section className="owner-bottom-grid">
        <section className="owner-panel owner-table-panel">
          <header>
            <span>Top Customers</span>
            <select value={customerPeriod} onChange={(event) => setCustomerPeriod(event.target.value)} aria-label="Top customers period">
              {LOG_PERIODS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </header>
          {customerPeriod === 'custom' ? (
            <div className="owner-panel-range">
              <input type="date" value={customerFrom} max={customerTo} onChange={(event) => setCustomerFrom(event.target.value)} />
              <span>→</span>
              <input type="date" value={customerTo} min={customerFrom} max={todayIso()} onChange={(event) => setCustomerTo(event.target.value)} />
            </div>
          ) : null}
          <table>
            <thead><tr><th>Customer</th><th>Spend</th><th>Orders</th><th>Last Order</th></tr></thead>
            <tbody>
              {topCustomers.length ? topCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td><i>{customer.fullName?.slice(0, 1)}</i>{customer.fullName}</td>
                  <td>{money.format(customer.spend)}</td>
                  <td>{customer.orders}</td>
                  <td>{customer.lastOrder ? customer.lastOrder.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ color: '#8a7a6a' }}>No invoices in this period.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="owner-panel owner-table-panel"><header><span>Inventory Alerts</span><button onClick={() => onNavigate?.('Inventory')}>View full inventory →</button></header><table><thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Status</th><th>Location</th></tr></thead><tbody>{lowStock.slice(0, 5).map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.type}</td><td>{item.quantity} {item.unit}</td><td><Status>{toNumber(item.quantity) <= 0 ? 'Out of Stock' : 'Low Stock'}</Status></td><td>{item.store || 'Lekki'}</td></tr>)}</tbody></table></section>
        <section className="owner-panel owner-table-panel"><header><span>Staff Performance (This Week)</span><button onClick={() => onNavigate?.('Staff')}>View all staff →</button></header><table><thead><tr><th>Staff Member</th><th>Role</th><th>Jobs Completed</th><th>Rating</th></tr></thead><tbody>{tailorRows.map((person, index) => <tr key={person.id}><td><i>{person.displayName?.slice(0, 1)}</i>{person.displayName}</td><td>Tailor</td><td>{productionJobs.filter((job) => worksOnJob(job, person.displayName) && job.status === 'Ready').length}</td><td>{(() => { const average = averageScore(productionJobs, person.displayName); return average === null ? <span style={{ color: '#8a7a6a' }}>Not scored</span> : `★ ${average.toFixed(1)} / 10`; })()}</td></tr>)}</tbody></table></section>
      </section>
    </div>
  );
}

function OwnerStoresPage({ sentInvoices = [] }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: '', location: '', manager: '', phone: '', email: '', status: 'active' };
  const [form, setForm] = useState(emptyForm);

  const reload = () => {
    setLoading(true);
    api.get('/oms/stores')
      .then((response) => setStores(response.data?.data?.stores || []))
      .catch((error) => setMessage(error.response?.data?.message || 'The store list could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const storeRevenue = (storeName) => {
    const matches = sentInvoices.filter(inv => String(inv.store || '').toLowerCase().includes(String(storeName || '').toLowerCase().split(' ')[0]));
    return { revenue: matches.reduce((s, inv) => s + toNumber(inv.total), 0), orders: matches.length };
  };

  const openCreate = () => { setForm(emptyForm); setEditing(null); setMessage(''); setShowForm(true); };
  const openEdit = (store) => {
    setForm({ name: store.name, location: store.location || '', manager: store.manager || '', phone: store.phone || '', email: store.email || '', status: store.status });
    setEditing(store.id);
    setMessage('');
    setShowForm(true);
  };
  const saveStore = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (editing) {
        await api.patch(`/oms/stores/${editing}`, form);
      } else {
        await api.post('/oms/stores', form);
      }
      setShowForm(false);
      reload();
    } catch (error) {
      setMessage(error.response?.data?.message || 'That store could not be saved.');
    } finally {
      setSaving(false);
    }
  };
  const deleteStore = async () => {
    try {
      await api.delete(`/oms/stores/${deletingId}`);
      setDeletingId(null);
      reload();
    } catch (error) {
      setMessage(error.response?.data?.message || 'That store could not be deleted.');
      setDeletingId(null);
    }
  };

  const statusLabel = (status) => (status === 'active' ? 'Active' : 'Inactive');
  const totalRevenue = stores.reduce((s, store) => s + storeRevenue(store.name).revenue, 0);
  const activeStores = stores.filter(s => s.status === 'active');
  const topStore = activeStores.reduce((best, store) => {
    const { revenue } = storeRevenue(store.name);
    return !best || revenue > storeRevenue(best.name).revenue ? store : best;
  }, null);

  const storeInitials = (name) => (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const storeAccentColors = ['#4a7bb5', '#2a7d4f', '#7b5ea7', '#c97b08'];

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Building2 size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Stores</h2>
            <p>Manage your store locations, staff and performance</p>
          </div>
        </div>
        <button type="button" onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> Add Store
        </button>
      </div>

      {message && !showForm && !deletingId ? (
        <div className="os-row-notice is-error" role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} aria-label="Dismiss">×</button>
        </div>
      ) : null}

      {/* KPI row */}
      <div className="os-kpi-row" style={{ gap: 14 }}>
        {[
          { label: 'Total Stores', value: stores.length, detail: `${activeStores.length} active`, icon: <Building2 size={16} />, color: '#c97b08' },
          { label: 'Active Stores', value: activeStores.length, detail: 'Currently operating', icon: <CheckCircle size={16} />, color: '#2a7d4f' },
          { label: 'Total Revenue', value: money.format(totalRevenue), detail: 'Across all stores', icon: <TrendingUp size={16} />, color: '#4a7bb5' },
          { label: 'Top Store', value: topStore?.name || '—', detail: money.format(storeRevenue(topStore?.name || '').revenue), icon: <Star size={16} />, color: '#7b5ea7' },
        ].map(({ label, value, detail, icon, color }) => (
          <div key={label} className="os-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
              <span style={{ color }}>{icon}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1611', marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#8a7a6a' }}>{detail}</div>
          </div>
        ))}
      </div>

      {/* View toggle + store grid/table */}
      <div className="os-card">
        <div className="os-card-head">
          <Building2 size={16} strokeWidth={1.5} style={{ color: '#c0a87a' }} />
          <div><strong>Store Locations</strong><p>{stores.length} location{stores.length !== 1 ? 's' : ''}</p></div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setViewMode('cards')}
              style={{ padding: '6px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: viewMode === 'cards' ? '#1a1611' : '#fff', color: viewMode === 'cards' ? '#fff' : '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MoreHorizontal size={13} /> Cards
            </button>
            <button type="button" onClick={() => setViewMode('table')}
              style={{ padding: '6px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: viewMode === 'table' ? '#1a1611' : '#fff', color: viewMode === 'table' ? '#fff' : '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={13} /> Table
            </button>
          </div>
        </div>

        {/* Card Grid View */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a7a6a' }}>Loading stores…</div>
        ) : viewMode === 'cards' && (
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {stores.map((store, idx) => {
              const { revenue, orders } = storeRevenue(store.name);
              const share = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0;
              const accent = storeAccentColors[idx % storeAccentColors.length];
              const isTop = topStore?.id === store.id;
              const inactive = store.status !== 'active';
              return (
                <div key={store.id} style={{ background: '#fff', border: '1px solid #eee5da', borderRadius: 12, overflow: 'hidden', opacity: inactive ? 0.75 : 1, position: 'relative' }}>
                  {/* Accent bar */}
                  <div style={{ height: 4, background: inactive ? '#eee5da' : accent }} />
                  {isTop && store.status === 'active' && (
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 3, background: '#fffbf0', border: '1px solid #e8d5a0', borderRadius: 20, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#7a6030' }}>
                      <Star size={9} /> Top Store
                    </div>
                  )}
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: inactive ? '#f3ede5' : `${accent}18`, border: `1px solid ${inactive ? '#eee5da' : `${accent}40`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: inactive ? '#b0a090' : accent, flexShrink: 0 }}>
                        {storeInitials(store.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1611', marginBottom: 4 }}>{store.name}</div>
                        <Status>{statusLabel(store.status)}</Status>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5a4e42' }}>
                        <MapPin size={11} style={{ color: '#b0a090', flexShrink: 0 }} />{store.location || 'No address on file'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5a4e42' }}>
                        <Users size={11} style={{ color: '#b0a090', flexShrink: 0 }} />{store.manager || 'No manager assigned'}
                      </div>
                      {store.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5a4e42' }}>
                          <Phone size={11} style={{ color: '#b0a090', flexShrink: 0 }} />{store.phone}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 14, borderTop: '1px solid #f3ede5', marginBottom: 14 }}>
                      {[['Revenue', money.format(revenue)], ['Orders', String(orders)], ['Share', `${share}%`]].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {store.status === 'active' && totalRevenue > 0 && (
                      <div style={{ height: 4, background: '#f3ede5', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${share}%`, background: accent, borderRadius: 2, transition: 'width 0.5s ease' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => openEdit(store)}
                        style={{ flex: 1, padding: '8px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button type="button" onClick={() => setDeletingId(store.id)}
                        style={{ padding: '8px 12px', border: '1px solid #f3d5cc', borderRadius: 8, background: '#fff5f0', color: '#8a3520', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add store card */}
            <button type="button" onClick={openCreate}
              style={{ background: '#faf7f3', border: '2px dashed #ddd5c8', borderRadius: 12, padding: '40px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#8a7a6a', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#c97b08'; e.currentTarget.style.color = '#c97b08'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd5c8'; e.currentTarget.style.color = '#8a7a6a'; }}>
              <Plus size={24} strokeWidth={1.5} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Add New Store</span>
            </button>
          </div>
        )}

        {/* Table View */}
        {!loading && viewMode === 'table' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Store', 'Location', 'Manager', 'Revenue', 'Orders', 'Share', 'Status', 'Actions'].map((col) => (
                    <th key={col} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.08em', background: '#faf7f3', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stores.map((store, idx) => {
                  const { revenue, orders } = storeRevenue(store.name);
                  const share = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0;
                  const accent = storeAccentColors[idx % storeAccentColors.length];
                  return (
                    <tr key={store.id} style={{ borderBottom: '1px solid #f3ede5' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0 }}>
                            {storeInitials(store.name)}
                          </span>
                          <strong style={{ color: '#1a1611' }}>{store.name}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#5a4e42' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} style={{ color: '#b0a090' }} />{store.location || '—'}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{store.manager || <span style={{ color: '#b0a090' }}>—</span>}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}><strong style={{ color: '#1a1611' }}>{money.format(revenue)}</strong></td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1a1611', fontWeight: 600, textAlign: 'center' }}>{orders}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#f3ede5', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${share}%`, background: accent, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#5a4e42', minWidth: 28 }}>{share}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}><Status>{statusLabel(store.status)}</Status></td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => openEdit(store)}
                            style={{ padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Edit2 size={11} /> Edit
                          </button>
                          <button type="button" onClick={() => setDeletingId(store.id)}
                            style={{ padding: '5px 8px', border: '1px solid #f3d5cc', borderRadius: 6, background: '#fff5f0', color: '#8a3520', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Store Form Modal */}
      {showForm && (
        <div className="receive-stock-backdrop">
          <form onSubmit={saveStore} style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: 480, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, border: '1px solid #eee5da', borderRadius: 8, background: '#faf7f3', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a4e42' }}>
              ×
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#faf7f3', border: '1px solid #eee5da', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97b08' }}>
                <Building2 size={20} strokeWidth={1.5} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1611' }}>{editing ? 'Edit Store' : 'New Store'}</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#8a7a6a' }}>{editing ? 'Update store details below.' : 'Add a new store location.'}</p>
              </div>
            </div>
            {message ? (
              <div className="os-row-notice is-error" role="status">
                <span>{message}</span>
                <button type="button" onClick={() => setMessage('')} aria-label="Dismiss">×</button>
              </div>
            ) : null}
            {[
              { label: 'Store Name', key: 'name', required: true, placeholder: 'e.g. Surulere Store' },
              { label: 'Location / Address', key: 'location', required: false, placeholder: 'e.g. Adeniran Ogunsanya St, Surulere, Lagos' },
              { label: 'Manager Name', key: 'manager', required: false, placeholder: 'Assigned store manager' },
              { label: 'Phone Number', key: 'phone', required: false, placeholder: 'Store contact number' },
              { label: 'Email Address', key: 'email', required: false, placeholder: 'Store contact email' },
            ].map(({ label, key, required, placeholder }) => (
              <label key={key} className="os-field">
                <span>{label}{required && <span style={{ color: '#d62828', marginLeft: 2 }}>*</span>}</span>
                <input required={required} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </label>
            ))}
            <label className="os-field">
              <span>Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd5c8', borderRadius: 10, background: '#fff', color: '#5a4e42', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: '#1a1611', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle size={15} /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Store'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="receive-stock-backdrop">
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: '#fff5f0', border: '1px solid #f3d5cc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a3520' }}>
              <Trash2 size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#1a1611' }}>Delete Store?</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#5a4e42', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{stores.find(s => s.id === deletingId)?.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button type="button" onClick={() => setDeletingId(null)}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd5c8', borderRadius: 10, background: '#fff', color: '#5a4e42', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={deleteStore}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, background: '#8a3520', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Delete Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TailorOverview({ currentRole, productionJobs = [], onUpdateJob }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const myJobs = productionJobs.filter((job) => worksOnJob(job, tailorName));
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
                <thead>
                  <tr>
                    <th>Delivery</th>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Tailor</th>
                    <th>Fabric</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityJobs.slice(0, 10).map((job) => {
                    const isOverdue = job.delivery && new Date(job.delivery) < new Date();
                    return (
                      <tr key={job.id} className={isOverdue ? 'row-overdue' : ''}>
                        <td data-label="Delivery">
                          <span className={classNames('delivery-date-cell', isOverdue && 'delivery-overdue')}>
                            {isOverdue && <AlertTriangle size={11} />}
                            {job.delivery || 'Not set'}
                          </span>
                        </td>
                        <td data-label="Customer">
                          <div className="table-customer-cell">
                            <div className="table-avatar">{job.customer.split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                            {job.customer}
                          </div>
                        </td>
                        <td data-label="Item">{job.item}</td>
                        <td data-label="Tailor">
                          <span className={job.tailor && job.tailor !== 'Unassigned' ? 'tailor-assigned' : 'tailor-unassigned'}>
                            {job.tailor || 'Unassigned'}
                          </span>
                        </td>
                        <td data-label="Fabric"><Status>{job.fabricConfirmed ? 'Confirmed' : 'Pending'}</Status></td>
                        <td data-label="Status"><Status>{job.status}</Status></td>
                      </tr>
                    );
                  })}
                </tbody>
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
              <div key={tailor} className="tailor-workload-row">
                <div className="tailor-workload-identity">
                  <div className="table-avatar table-avatar--sm">{tailor.split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                  <span className="tailor-workload-name">{tailor}<small>Active assignments</small></span>
                </div>
                <div className="tailor-workload-count">
                  <strong>{workload}</strong>
                  <div className="tailor-workload-bar" style={{ '--fill': `${Math.min(workload / 5, 1) * 100}%` }} />
                </div>
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
              <article key={job.id} className="prod-summary-card prod-summary-card--alert">
                <div className="prod-summary-card-head">
                  <div className="prod-summary-avatar">{job.customer.split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                  <div className="prod-summary-info">
                    <strong>{job.customer}</strong>
                    <span>{job.item}</span>
                  </div>
                  <Status>{job.status}</Status>
                </div>
                <div className="prod-summary-card-meta">
                  <AlertTriangle size={11} />
                  No tailor assigned · Delivery {job.delivery || 'not set'}
                </div>
              </article>
            )) : <div className="invoice-preview-empty">Every active job has a tailor.</div>}
          </div>
        </div>

        <div className="panel">
          <SectionHeader eyebrow="Materials" title="Fabric Confirmation Pending" />
          <div className="production-summary-list">
            {fabricPending.length ? fabricPending.slice(0, 6).map((job) => (
              <article key={job.id} className="prod-summary-card prod-summary-card--warn">
                <div className="prod-summary-card-head">
                  <div className="prod-summary-avatar">{job.customer.split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                  <div className="prod-summary-info">
                    <strong>{job.customer}</strong>
                    <span>{job.item}</span>
                  </div>
                  <Status>Pending</Status>
                </div>
                <div className="prod-summary-card-meta">
                  <Clock size={11} />
                  {job.fabric || 'Fabric not selected'} · Awaiting confirmation
                </div>
              </article>
            )) : <div className="invoice-preview-empty">Fabric is confirmed for every production job.</div>}
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Latest updates" title="Recent Production Activity" />
        <div className="inventory-recent-list">
          {[...productionJobs].sort((a, b) => new Date(b.updatedAt || b.assignedAt) - new Date(a.updatedAt || a.assignedAt)).slice(0, 6).map((job) => (
            <article key={job.id} className="prod-activity-card">
              <div className="prod-activity-card-head">
                <div className="prod-summary-avatar prod-summary-avatar--sm">{job.customer.split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                <div className="prod-summary-info">
                  <strong>{job.customer}</strong>
                  <span>{job.item} · {job.tailor || 'Unassigned'}</span>
                </div>
                <Status>{job.status}</Status>
              </div>
              <small className="prod-activity-time">{job.updatedAt ? `Updated ${new Date(job.updatedAt).toLocaleString('en-GB')}` : `Assigned ${job.assignedAt || 'pending'}`}</small>
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
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Package size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Orders</h2>
            <p>All orders across all stores</p>
          </div>
        </div>
        <span style={{ fontSize: 12, color: '#8a7a6a', background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 20, padding: '4px 12px', fontWeight: 600 }}>
          {liveOrders.length} live order{liveOrders.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Live Orders Row */}
      {liveOrders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {liveOrders.map((order) => (
            <div key={order.invoiceNumber} className="os-card" style={{ borderLeft: '3px solid #c97b08' }}>
              <div className="os-card-head" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8a7a6a' }}>{order.invoiceNumber}</span>
                  <Status>{order.status}</Status>
                </div>
              </div>
              <div className="os-card-body" style={{ gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1611' }}>{order.customer}</div>
                  <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{order.item} · {order.pieces} {order.pieces === 1 ? 'piece' : 'pieces'} · {order.store}</div>
                </div>
                <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', margin: 0 }}>
                  {[
                    ['Total', money.format(order.total)],
                    ['Payment', <Status key="pay">{order.paymentStatus}</Status>],
                    ['Delivery', order.delivery || 'Not set'],
                    ['Tailor', order.tailor || 'Unassigned'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <dt style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>{label}</dt>
                      <dd style={{ fontSize: 12, fontWeight: 600, color: '#1a1611', margin: 0 }}>{value}</dd>
                    </div>
                  ))}
                </dl>
                {order.note && <p style={{ fontSize: 12, color: '#8a7a6a', margin: 0, paddingTop: 8, borderTop: '1px solid #f3ede5' }}>{order.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Register Table */}
      <div className="os-card">
        <div className="os-card-head">
          <FileText size={16} strokeWidth={1.5} style={{ color: '#c0a87a' }} />
          <div><strong>Invoice Register</strong><p>Invoices created by store managers</p></div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: '#b0a090', pointerEvents: 'none' }} />
              <input
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, width: 220, outline: 'none' }}
                placeholder="Search invoice or customer"
                value={invoiceSearch}
                onChange={(event) => updateInvoiceSearch(event.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #eee5da' }}>
          {[
            { label: 'Total Invoices', value: sentInvoices.length },
            { label: 'Fully Paid', value: sentInvoices.filter(inv => inv.paymentStatus === 'Fully Paid').length },
            { label: 'Partial Paid', value: sentInvoices.filter(inv => inv.paymentStatus === 'Partial Paid').length },
            { label: 'Not Paid', value: sentInvoices.filter(inv => !inv.paymentStatus || inv.paymentStatus === 'Not Paid' || inv.paymentStatus === 'Awaiting Payment').length },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, padding: '12px 16px', borderRight: i < 3 ? '1px solid #eee5da' : 'none', background: '#faf7f3' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1611' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Invoice', 'Customer', 'Store', 'Item', 'Amount', 'Payment', 'Accounts', 'Date'].map((col) => (
                  <th key={col} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.08em', background: '#faf7f3', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.length > 0 ? visibleInvoices.map((invoice) => (
                <tr key={invoice.invoiceNumber} style={{ borderBottom: '1px solid #f3ede5' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}><strong style={{ fontFamily: 'monospace', fontSize: 11, color: '#c97b08' }}>{invoice.invoiceNumber}</strong></td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3ede5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#5a4e42', flexShrink: 0 }}>
                        {(invoice.customer || '').split(' ').map(p => p[0]).join('').slice(0, 2)}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1a1611' }}>{invoice.customer}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{invoice.store}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invoice.item || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}><strong style={{ color: '#1a1611' }}>{money.format(invoice.total)}</strong></td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}><Status>{invoice.paymentStatus}</Status></td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}><Status>{invoiceApprovalStatus(invoice)}</Status></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a', whiteSpace: 'nowrap' }}>
                    {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 13 }}>
                    {sentInvoices.length ? 'No invoices match your search.' : 'Sent invoices will appear here after the Store Manager sends an invoice email.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div style={{ display: 'none' }} className="orders-mobile-list">
          {visibleInvoices.map((invoice) => (
            <div key={invoice.invoiceNumber} style={{ padding: '14px 16px', borderBottom: '1px solid #f3ede5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#c97b08', marginBottom: 2 }}>{invoice.invoiceNumber}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{invoice.customer}</div>
                  <div style={{ fontSize: 12, color: '#8a7a6a' }}>{invoice.store}</div>
                </div>
                <Status>{invoice.paymentStatus}</Status>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px solid #f3ede5' }}>
                <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>Amount</div><div style={{ fontWeight: 700, fontSize: 13 }}>{money.format(invoice.total)}</div></div>
                <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>Approval</div><Status>{invoiceApprovalStatus(invoice)}</Status></div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filteredInvoices.length > invoicePageSize && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #eee5da', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf7f3' }}>
            <span style={{ fontSize: 12, color: '#8a7a6a' }}>Showing {invoiceStart}–{invoiceEnd} of {filteredInvoices.length}</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button type="button" onClick={() => setInvoicePage(Math.max(1, currentInvoicePage - 1))} disabled={currentInvoicePage === 1}
                style={{ border: '1px solid #ddd5c8', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', background: '#fff', color: '#5a4e42', opacity: currentInvoicePage === 1 ? 0.4 : 1 }}>
                Previous
              </button>
              <span style={{ fontSize: 12, color: '#5a4e42', padding: '0 8px', fontWeight: 600 }}>{currentInvoicePage} / {invoicePageCount}</span>
              <button type="button" onClick={() => setInvoicePage(Math.min(invoicePageCount, currentInvoicePage + 1))} disabled={currentInvoicePage === invoicePageCount}
                style={{ border: '1px solid #ddd5c8', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', background: '#fff', color: '#5a4e42', opacity: currentInvoicePage === invoicePageCount ? 0.4 : 1 }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Correcting an invoice after it has gone out: the lines, who it is for, when
// it is due. Totals are recomputed by the server from the lines, so an edited
// invoice cannot disagree with the sum of its own items, and it refuses to be
// cut below what has already been paid against it.
function EditInvoiceModal({ invoice, onClose, onSaved }) {
  const [items, setItems] = useState(() => (invoice.items || []).map((item, index) => ({
    key: `line-${index}`,
    description: item.description || '',
    quantity: toNumber(item.quantity) || 1,
    rate: toNumber(item.rate),
    discountPercent: toNumber(item.discountPercent),
  })));
  const [customerName, setCustomerName] = useState(invoice.customer || '');
  const [customerPhone, setCustomerPhone] = useState(invoice.customerPhone || '');
  const [dueDate, setDueDate] = useState(invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateLine = (index, field, value) => setItems((current) => current.map((item, position) => (
    position === index ? { ...item, [field]: value } : item
  )));

  const save = async () => {
    setError('');
    if (items.some((item) => !item.description.trim())) { setError('Every line needs a description.'); return; }
    setSaving(true);
    try {
      const response = await api.patch(`/oms/invoices/${invoice.invoiceNumber}`, {
        // Only the wording travels. The figures are the invoice's own and are
        // left exactly as they were.
        items: items.map((item) => ({ description: item.description, note: item.note })),
        customerName,
        customerPhone,
        dueDate,
      });
      onSaved?.(response.data?.data?.invoice);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'That invoice could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="os-confirm-backdrop" onClick={onClose}>
      <div className="os-confirm edit-invoice" onClick={(event) => event.stopPropagation()}>
        <h3>Edit {invoice.invoiceNumber}</h3>
        <p className="edit-invoice-note">
          You can correct the customer's details and what each item is called.
          The price, quantity and discounts stay as they were sent to the
          customer — they can't be changed here.
        </p>

        <div className="edit-invoice-grid">
          <label className="os-field">
            <span>Customer</span>
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          </label>
          <label className="os-field">
            <span>Phone</span>
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          </label>
          <label className="os-field">
            <span>Due date</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>

        <div className="edit-invoice-lines">
          {items.map((item, index) => (
            <div key={item.key}>
              <input
                value={item.description}
                onChange={(event) => updateLine(index, 'description', event.target.value)}
                placeholder="Description"
                aria-label={`Line ${index + 1} description`}
              />
              {/* Shown so the reader knows which line they are correcting, but
                  not editable — changing any of these changes the money. */}
              <span title="Quantity">{toNumber(item.quantity)}</span>
              <span title="Rate">{money.format(toNumber(item.rate))}</span>
              <span title="Discount">{toNumber(item.discountPercent) ? `${toNumber(item.discountPercent)}%` : '—'}</span>
            </div>
          ))}
        </div>

        <dl className="edit-invoice-total">
          <dt>Balance due</dt><dd><strong>{money.format(toNumber(invoice.total))}</strong></dd>
          <dt>Recorded as paid</dt><dd>{money.format(toNumber(invoice.paid))}</dd>
        </dl>

        {error ? <p className="edit-invoice-error">{error}</p> : null}

        <div className="edit-invoice-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save invoice'}</button>
        </div>
      </div>
    </div>
  );
}

function StoreInvoicesView({ sentInvoices = [], currentRole, onInvoiceSent, onApproveInvoice, onInvoiceChanged, onInvoiceDeleted }) {
  const [editingInvoice, setEditingInvoice] = useState(null);
  // An invoice belongs to whoever raised it and to the people who run the shop.
  // Removing one is the Owner's and Admin's alone — a store manager cannot
  // delete an invoice even if they raised it.
  const mayEdit = (invoice) => ['owner', 'admin'].includes(currentRole?.id)
    // Matched on the creator's id, as the server does — a display name is not
    // unique, so it is not proof that this is your invoice.
    || (Boolean(invoice.createdByStaffId) && invoice.createdByStaffId === currentRole?.staffId);
  // Once Accounts have approved an invoice it is part of the books, so it can
  // no longer be deleted by anyone — the server refuses it either way.
  const mayDelete = (invoice) => ['owner', 'admin'].includes(currentRole?.id)
    && invoiceApprovalStatus(invoice) !== 'Approved';

  // Held in one place so the phone offers exactly what the desktop does. The
  // three-dot menu existed only in the table, so on a phone there was no way to
  // download an invoice, resend it, edit it or delete it.
  const invoiceActions = (invoice) => [
    ['View Invoice', <Eye size={12} strokeWidth={2} />, () => { window.scrollTo(0, 0); setSelectedInvoice(invoice); }],
    ['Download PDF', <Download size={12} strokeWidth={2} />, () => downloadInvoicePdf(invoice)],
    ['Resend Email', <RefreshCw size={12} strokeWidth={2} />, () => resendInvoiceEmail(invoice)],
    ...(mayEdit(invoice) ? [['Edit Invoice', <Edit2 size={12} strokeWidth={2} />, () => setEditingInvoice(invoice)]] : []),
    ...(onApproveInvoice && invoiceApprovalStatus(invoice) !== 'Approved'
      ? [['Approve', <CheckCircle size={12} strokeWidth={2} />, () => onApproveInvoice(invoice.invoiceNumber, 'Approved')]]
      : []),
    ...(mayDelete(invoice) ? [['Delete Invoice', <Trash2 size={12} strokeWidth={2} />, () => removeInvoice(invoice)]] : []),
  ];

  const removeInvoice = async (invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber} for ${invoice.customer}? This cannot be undone.`)) return;
    try {
      await api.delete(`/oms/invoices/${invoice.invoiceNumber}`);
      onInvoiceDeleted?.(invoice.invoiceNumber);
      setRowNotice(`${invoice.invoiceNumber} was deleted.`);
    } catch (error) {
      setRowNotice(error.response?.data?.message || 'That invoice could not be deleted.');
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [rowNotice, setRowNotice] = useState('');
  const invoiceKpiRef = useRef(null);

  // A dashboard tile can arrive with ?status= to preset the tab, or ?invoice=
  // to open one invoice directly. The parameter is consumed so a later manual
  // tab change is not undone by a re-render.
  const requestedInvoice = searchParams.get('invoice');
  useEffect(() => {
    if (!requestedInvoice) return;
    const match = sentInvoices.find((item) => item.invoiceNumber === requestedInvoice);
    if (!match) return;
    setSelectedInvoice(match);
    setSearchParams({}, { replace: true });
  }, [requestedInvoice, sentInvoices, setSearchParams]);

  // Started from a customer profile: open the create screen with that
  // customer already filled in.
  const [prefillCustomer, setPrefillCustomer] = useState(null);
  const requestedNew = searchParams.get('new');
  useEffect(() => {
    if (!requestedNew) return;
    setPrefillCustomer({
      fullName: searchParams.get('customer') || '',
      phone: searchParams.get('phone') || '',
      email: searchParams.get('email') || '',
    });
    setCreating(true);
    setSearchParams({}, { replace: true });
  }, [requestedNew, searchParams, setSearchParams]);

  const downloadInvoicePdf = async (invoice) => {
    setRowNotice('');
    try {
      const response = await api.post('/oms/invoices/html-preview', invoiceDocumentPayload(invoice), { responseType: 'text' });
      await saveInvoicePdf(response.data, invoice.invoiceNumber);
    } catch (error) {
      setRowNotice(error.response?.data?.message || 'Could not prepare that invoice PDF.');
    }
  };

  const resendInvoiceEmail = async (invoice) => {
    setRowNotice('');
    if (!invoice.email) { setRowNotice(`${invoice.invoiceNumber} has no customer email on record.`); return; }
    try {
      await api.post('/oms/invoices/send-email', { ...invoiceDocumentPayload(invoice), recipientEmail: invoice.email, createdByName: currentRole?.name });
      setRowNotice(`${invoice.invoiceNumber} was resent to ${invoice.email}.`);
    } catch (error) {
      setRowNotice(error.response?.data?.message || `Could not resend ${invoice.invoiceNumber}.`);
    }
  };

  const [activeInvoiceKpiDot, setActiveInvoiceKpiDot] = useState(0);
  const INVOICE_KPI_COUNT = 4;
  const handleInvoiceKpiScroll = () => {
    if (!invoiceKpiRef.current) return;
    const { scrollLeft, scrollWidth } = invoiceKpiRef.current;
    setActiveInvoiceKpiDot(Math.round(scrollLeft / (scrollWidth / INVOICE_KPI_COUNT)));
  };
  const filteredInvoices = sentInvoices.filter((invoice) => {
    const matchesSearch = `${invoice.invoiceNumber} ${invoice.customer} ${invoice.store} ${invoice.paymentStatus}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All'
      || (statusFilter === 'Pending' && invoiceApprovalStatus(invoice) === 'Pending Accounts')
      || (statusFilter === 'FullyPaid' && invoice.paymentStatus === 'Fully Paid')
      || (statusFilter === 'Partial' && invoice.paymentStatus === 'Partial Paid')
      || (statusFilter === 'AwaitingPayment' && isAwaitingPayment(invoice));
    return matchesSearch && matchesStatus;
  });
  const total = sentInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const pending = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts');
  const partial = sentInvoices.filter((invoice) => invoice.paymentStatus === 'Partial Paid');

  if (creating) {
    return (
      <div className="store-invoice-create">
        <div className="store-detail-toolbar">
          <button type="button" onClick={() => setCreating(false)}>← &nbsp; Back to Invoices</button>
        </div>
        <NewInvoiceView currentRole={currentRole} prefillCustomer={prefillCustomer} onInvoiceSent={(invoice) => {
          onInvoiceSent?.(invoice);
          setCreating(false);
          setPrefillCustomer(null);
        }} />
      </div>
    );
  }

  if (selectedInvoice) {
    const invoice = selectedInvoice;
    const job = invoice.orderSheet || {};
    // A part payment was shown as exactly half the invoice, which is a number
    // nobody entered. Nothing records how much was handed over, so it says so.
    const paidAmount = amountReceived(invoice);
    const balance = paidAmount === null ? null : Math.max(0, invoicePayable(invoice) - paidAmount);
    const asMoney = (value) => (value === null ? 'Not recorded' : money.format(value));
    const dueDate = invoice.dueDate || invoice.deliveryDate || job.delivery;
    return (
      <div className="store-order-detail">
        <div className="store-detail-toolbar"><button type="button" onClick={() => setSelectedInvoice(null)}>← &nbsp; Back to Invoices</button><div><button type="button" onClick={() => downloadInvoicePdf(invoice)}>▣ &nbsp; Print</button></div></div>
        <section className="store-order-hero">
          <div><span>{invoice.invoiceNumber}</span><h2>{invoice.customer}</h2><p>{invoice.item || 'Custom Order'} · {invoice.pieces || job.pieces || 1} {(invoice.pieces || job.pieces || 1) === 1 ? 'piece' : 'pieces'} · {invoice.store}</p></div>
          <Status>{invoice.paymentStatus}</Status>
          <dl><div><dt>▣ &nbsp; Invoice Date</dt><dd>{formatMoment(invoice.invoiceDate || invoice.createdAt)}</dd></div><div><dt>▣ &nbsp; Due Date</dt><dd>{formatMoment(dueDate)}</dd></div><div><dt>▱ &nbsp; Store</dt><dd>{invoice.store} Store</dd></div></dl>
        </section>
        {/* Payments and Notes & History were tabs that could be clicked and
            changed nothing — there was only ever one panel behind them. */}
        <div className="store-detail-grid">
          <div className="store-detail-main">
            <section className="store-detail-panel order-information"><h3>Invoice Information</h3><dl>
              <div><dt>Payment Status</dt><dd><Status>{invoice.paymentStatus}</Status></dd><dt>Payment Method</dt><dd>{invoice.paymentMethod || '—'}</dd><dt>Store</dt><dd>{invoice.store} Store</dd><dt>Customer Phone</dt><dd>{invoice.phone || job.phone || '—'}</dd></div>
              <div><dt>Invoice Number</dt><dd><strong>{invoice.invoiceNumber}</strong></dd><dt>Sales Person</dt><dd>{invoice.createdBy || '—'}</dd><dt>Customer Email</dt><dd>{invoice.email || '—'}</dd></div>
            </dl></section>
            <section className="store-detail-panel order-timeline"><h3>Timeline</h3><div><article className="done"><i>✓</i><span><strong>Invoice Created</strong><small>{invoice.createdBy ? `by ${invoice.createdBy}` : `${invoice.store} store`}</small></span><time>{formatMoment(invoice.createdAt)}</time></article>{isAwaitingPayment(invoice) ? null : <article className="paid"><i>●</i><span><strong>Payment Recorded ({invoice.paymentStatus})</strong><small>{paidAmount === null ? 'Amount not recorded' : `${money.format(paidAmount)} received`}{invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ''}</small></span><time>{invoice.paymentHistory?.length ? formatMoment(invoice.paymentHistory[invoice.paymentHistory.length - 1].recordedAt) : '—'}</time></article>}{/* This step was fixed at a hollow marker with a dash for the time, so
                  the timeline never moved on however the invoice stood. */}
              {(() => {
                const approval = invoiceApprovalStatus(invoice);
                const approved = approval === 'Approved';
                const refused = ['Flagged', 'Rejected'].includes(approval);
                return (
                  <article className={approved ? 'done' : refused ? 'flagged' : ''}>
                    <i>{approved ? '✓' : refused ? '!' : '○'}</i>
                    <span>
                      <strong>{approved ? 'Accounts Approved' : refused ? `Accounts ${approval}` : 'Awaiting Approval'}</strong>
                      <small>
                        {approved
                          ? `Approved by ${invoice.accountApprovedBy || 'Accounts'}`
                          : refused
                            ? invoice.accountApprovalNote || 'Sent back by Accounts'
                            : 'Waiting for accounts approval'}
                      </small>
                    </span>
                    <time>{invoice.accountApprovedAt ? formatMoment(invoice.accountApprovedAt) : '—'}</time>
                  </article>
                );
              })()}</div></section>
          </div>
          <aside className="store-detail-rail">
            <section className="store-detail-panel order-summary"><h3>Invoice Summary</h3><dl><div><dt>Invoice Total</dt><dd>{money.format(invoice.total)}</dd></div><div><dt>Amount Paid</dt><dd className={paidAmount === null ? '' : 'green'}>{asMoney(paidAmount)}</dd></div><div><dt>Balance Due</dt><dd className={balance === null ? '' : 'red'}>{asMoney(balance)}</dd></div></dl><div><span>Balance Due</span><strong>{asMoney(balance)}</strong></div></section>
            {/* Both rows here looked like downloads and neither was clickable. The
                invoice can be produced on demand; an order sheet only exists
                once production has raised one. */}
            <section className="store-detail-panel detail-documents"><h3>Documents</h3>
              <article role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => downloadInvoicePdf(invoice)} onKeyDown={(event) => { if (event.key === 'Enter') downloadInvoicePdf(invoice); }}><i>▤</i><span><strong>Invoice PDF</strong><small>Open to print or save</small></span></article>
              {invoice.orderSheet ? <article><i>▤</i><span><strong>Order Sheet</strong><small>Attached to this invoice</small></span></article> : <article><i>▤</i><span><strong>Order Sheet</strong><small>Not raised yet</small></span></article>}
            </section>
          </aside>
        </div>
      </div>
    );
  }

  const fullyPaid = sentInvoices.filter(isFullyPaid);
  const awaitingPayment = sentInvoices.filter(isAwaitingPayment);

  const tabs = [
    { key: 'All', label: 'All', count: sentInvoices.length },
    { key: 'Pending', label: 'Awaiting Approval', count: pending.length },
    { key: 'AwaitingPayment', label: 'Awaiting Payment', count: awaitingPayment.length },
    { key: 'Partial', label: 'Partial Paid', count: partial.length },
    { key: 'FullyPaid', label: 'Fully Paid', count: fullyPaid.length },
  ];

  return (
    <div className="os-page">
      {editingInvoice ? (
        <EditInvoiceModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={(updated) => {
            if (updated) onInvoiceChanged?.(updated);
            setRowNotice(`${editingInvoice.invoiceNumber} was updated.`);
          }}
        />
      ) : null}
      <div className="os-page-header">
        <div className="os-page-title">
          <FileText size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Invoices</h2>
            <p>View and manage invoices you&apos;ve sent</p>
          </div>
        </div>
        <button
          className="os-release-btn"
          type="button"
          style={{ width: 'auto', padding: '10px 18px', fontSize: 13 }}
          onClick={() => setCreating(true)}
        >
          <Plus size={15} strokeWidth={2} />
          New Invoice
        </button>
      </div>

      <div className="kpi-carousel-wrap">
        <section className="store-invoice-kpis os-kpi-row" ref={invoiceKpiRef} onScroll={handleInvoiceKpiScroll}>
          {[
            { icon: <FileText size={18} strokeWidth={1.5} />, label: 'Total Sent', value: sentInvoices.length, detail: money.format(total), tone: 'gold' },
            { icon: <Clock size={18} strokeWidth={1.5} />, label: 'Awaiting Approval', value: pending.length, detail: 'Pending accounts review', tone: 'gold' },
            { icon: <CreditCard size={18} strokeWidth={1.5} />, label: 'Awaiting Payment', value: awaitingPayment.length, detail: 'Outstanding balances', tone: 'blue' },
            { icon: <CheckCircle size={18} strokeWidth={1.5} />, label: 'Fully Paid', value: fullyPaid.length, detail: 'Cleared invoices', tone: 'green' },
          ].map(({ icon, label, value, detail, tone }) => (
            <article className={`store-order-kpi ${tone}`} key={label}>
              <i style={{ display: 'flex', alignItems: 'center' }}>{icon}</i>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </section>
      </div>

      {rowNotice ? (
        <div className="os-row-notice" role="status">
          <span>{rowNotice}</span>
          <button type="button" onClick={() => setRowNotice('')} aria-label="Dismiss">×</button>
        </div>
      ) : null}

      <div className="os-card" style={{ overflow: 'visible' }}>
        <div className="os-card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <nav className="os-filter-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: statusFilter === tab.key ? '#1a1611' : 'transparent',
                  color: statusFilter === tab.key ? '#ffffff' : '#5a4e42',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
                <span style={{
                  background: statusFilter === tab.key ? 'rgba(255,255,255,0.2)' : '#eee5da',
                  color: statusFilter === tab.key ? '#fff' : '#8a7a6a',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} strokeWidth={2} style={{ position: 'absolute', left: 10, color: '#b0a090', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, customer..."
              style={{
                paddingLeft: 32,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                border: '1px solid #ddd5c8',
                borderRadius: 8,
                fontSize: 13,
                color: '#1a1611',
                background: '#fff',
                outline: 'none',
                width: 220,
              }}
            />
          </div>
        </div>

        <div className="os-card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }} className="si-table-wrap os-desktop-table">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Invoice #', 'Customer', 'Amount', 'Payment', 'Approval', 'Date', 'Actions'].map((th) => (
                    <th key={th} style={{
                      textTransform: 'uppercase',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: '#8a7a6a',
                      padding: '11px 14px',
                      background: '#faf7f3',
                      textAlign: 'left',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>{th}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.invoiceNumber}
                    style={{ borderBottom: '1px solid #f3ede5', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                  >
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <span style={{ fontWeight: 800, color: '#0f0b06', fontSize: 13, letterSpacing: '0.01em' }}>{invoice.invoiceNumber}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: '#1a1611', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {invoice.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#3d352c', fontSize: 13 }}>{invoice.customer}</div>
                          <div style={{ color: '#8a7a6a', fontSize: 11 }}>{invoice.store} Store</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <strong style={{ color: '#1a1611' }}>{money.format(invoice.total)}</strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <Status>{invoice.paymentStatus}</Status>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <Status>{invoiceApprovalStatus(invoice)}</Status>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', whiteSpace: 'nowrap' }}>
                      {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => { window.scrollTo(0, 0); setSelectedInvoice(invoice); }}
                          style={{
                            border: '1px solid #ddd5c8', borderRadius: 6,
                            padding: '5px 10px', fontSize: 12, fontWeight: 600,
                            background: '#fff', color: '#5a4e42', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <Eye size={12} strokeWidth={2} />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === invoice.invoiceNumber ? null : invoice.invoiceNumber)}
                          style={{
                            border: '1px solid #ddd5c8', borderRadius: 6,
                            padding: '5px 8px', fontSize: 12,
                            background: '#fff', color: '#5a4e42', cursor: 'pointer',
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          <MoreHorizontal size={14} strokeWidth={2} />
                        </button>
                        {openMenu === invoice.invoiceNumber && (
                          <div className="customer-action-menu" style={{ right: 0, left: 'auto' }}>
                            {invoiceActions(invoice).map(([label, icon, action]) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => { setOpenMenu(null); action(); }}
                              >
                                <i style={{ display: 'flex' }}>{icon}</i>
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredInvoices.length && (
              <div className="accounts-empty" style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 13 }}>
                {sentInvoices.length ? 'No invoices match your search.' : 'No invoices have been sent yet.'}
              </div>
            )}
          </div>

          <div className="store-invoice-mobile-list os-customers-mobile-list" style={{ padding: '0 14px 14px' }}>
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.invoiceNumber}
                style={{
                  background: '#fff',
                  border: '1px solid #eee5da',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  cursor: 'pointer',
                }}
                onClick={() => { window.scrollTo(0, 0); setSelectedInvoice(invoice); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f0b06', marginBottom: 2 }}>{invoice.invoiceNumber}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#3d352c' }}>{invoice.customer}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>{invoice.store} Store</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Status>{invoice.paymentStatus}</Status>
                    {/* The same actions the desktop row carries. Without this
                        an invoice could not be downloaded from a phone. */}
                    <div style={{ position: 'relative' }} onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        aria-label={`Actions for ${invoice.invoiceNumber}`}
                        onClick={() => setOpenMenu(openMenu === `m-${invoice.invoiceNumber}` ? null : `m-${invoice.invoiceNumber}`)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 34, height: 34, border: '1px solid #ddd5c8', borderRadius: 8,
                          background: '#fff', color: '#5a4e42', cursor: 'pointer',
                        }}
                      >
                        <MoreHorizontal size={15} strokeWidth={2} />
                      </button>
                      {openMenu === `m-${invoice.invoiceNumber}` && (
                        <div className="customer-action-menu" style={{ right: 0, left: 'auto' }}>
                          {invoiceActions(invoice).map(([label, icon, action]) => (
                            <button key={label} type="button" onClick={() => { setOpenMenu(null); action(); }}>
                              <i style={{ display: 'flex' }}>{icon}</i>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 10, borderTop: '1px solid #f3ede5' }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em', marginBottom: 2 }}>Amount</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{money.format(invoice.total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em', marginBottom: 2 }}>Approval</div>
                    <Status>{invoiceApprovalStatus(invoice)}</Status>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em', marginBottom: 2 }}>Date</div>
                    <div style={{ fontSize: 12, color: '#5a4e42' }}>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, color: '#c97b08', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                      View <ChevronRight size={12} strokeWidth={2.5} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {!filteredInvoices.length && (
              <div className="accounts-empty" style={{ textAlign: 'center', padding: '32px 16px', color: '#8a7a6a', fontSize: 13 }}>
                {sentInvoices.length ? 'No invoices match your search.' : 'No invoices have been sent yet.'}
              </div>
            )}
          </div>
        </div>

        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid #eee5da',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#faf7f3',
        }}>
          <span style={{ fontSize: 12, color: '#8a7a6a' }}>
            Showing {filteredInvoices.length ? 1 : 0}–{filteredInvoices.length} of {sentInvoices.length} invoices
          </span>
          {/* A ‹ 1 › paginator stood here and did nothing when clicked. This
              list is not paged — every invoice that matches is on screen. */}
        </div>
      </div>
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
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Users size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Customers</h2>
            <p>All customer profiles across stores</p>
          </div>
        </div>
      </div>

      {/* KPI stats row */}
      <div className="os-kpi-row" style={{ gap: 14 }}>
        {[
          { label: 'Total Customers', value: customers.length, detail: 'Live profiles', icon: <Users size={16} /> },
          { label: 'Returning', value: repeatCustomers, detail: 'More than one order', icon: <RefreshCw size={16} /> },
          { label: 'With Measurements', value: withMeasurements, detail: 'Profiles on file', icon: <CheckCircle size={16} /> },
          { label: 'Lifetime Invoiced', value: money.format(totalSpend), detail: 'Total revenue', icon: <CreditCard size={16} /> },
        ].map(({ label, value, detail, icon }) => (
          <div key={label} className="os-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
              <span style={{ color: '#c0a87a' }}>{icon}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1611', marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#8a7a6a' }}>{detail}</div>
          </div>
        ))}
      </div>

      <div className="os-card">
        <div className="os-card-head">
          <Users size={16} strokeWidth={1.5} style={{ color: '#c0a87a' }} />
          <div><strong>Customer Profiles</strong><p>{filteredCustomers.length} of {customers.length} customers</p></div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: '#b0a090', pointerEvents: 'none' }} />
              <input
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, width: 240, outline: 'none' }}
                placeholder="Search name, phone, email, store…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>

        {message ? <div style={{ padding: '10px 18px', color: '#8a3520', background: '#fff5f0', borderBottom: '1px solid #eee5da', fontSize: 13 }}>{message}</div> : null}

        {/* Desktop table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 13 }}>Loading customers…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Customer', 'Phone', 'Store(s)', 'Category', 'Orders', '12-Month Spend', 'Last Order'].map((col) => (
                    <th key={col} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.08em', background: '#faf7f3', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                  <tr key={customer.id} style={{ borderBottom: '1px solid #f3ede5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3ede5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#5a4e42', flexShrink: 0 }}>
                          {customer.fullName.split(' ').map(p => p[0]).join('').slice(0, 2)}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1a1611' }}>{customer.fullName}</div>
                          <div style={{ fontSize: 11, color: '#8a7a6a' }}>{customer.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>
                      {customer.phone ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} style={{ color: '#b0a090' }} />{customer.phone}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{customer.stores?.join(', ') || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}><Status>{customer.category}</Status></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#1a1611', fontWeight: 600, textAlign: 'center' }}>{customer.totalOrders}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}><strong style={{ color: '#1a1611' }}>{money.format(customer.twelveMonthSpend)}</strong></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a', whiteSpace: 'nowrap' }}>
                      {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No orders yet'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 13 }}>
                      {customers.length ? 'No customers match your search.' : 'No customer records are available yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile card list */}
        <div className="customers-mobile-list" style={{ display: 'none' }}>
          {filteredCustomers.map((customer) => (
            <div key={customer.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3ede5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3ede5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#5a4e42', flexShrink: 0 }}>
                    {customer.fullName.split(' ').map(p => p[0]).join('').slice(0, 2)}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{customer.fullName}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>{customer.phone || customer.email || 'No contact'}</div>
                  </div>
                </div>
                <Status>{customer.category}</Status>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px solid #f3ede5' }}>
                <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>Orders</div><div style={{ fontWeight: 700, fontSize: 13 }}>{customer.totalOrders}</div></div>
                <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>12M Spend</div><div style={{ fontWeight: 700, fontSize: 13 }}>{money.format(customer.twelveMonthSpend)}</div></div>
                <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>Store</div><div style={{ fontSize: 12, color: '#5a4e42' }}>{customer.stores?.[0] || '—'}</div></div>
              </div>
            </div>
          ))}
          {!filteredCustomers.length && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8a7a6a', fontSize: 13 }}>
              {customers.length ? 'No customers match your search.' : 'No customer records are available yet.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The invoice document is laid out for email and print at a fixed 760px, so on
// a phone it ran off the side of the preview. It is scaled to the space
// available instead — the document itself is untouched, and the zoom controls,
// which previously did nothing at all, now drive that scale.
const INVOICE_DOCUMENT_WIDTH = 760;
const INVOICE_PREVIEW_HEIGHT = 690;

function InvoiceDocumentPreview({ html, invoiceNumber }) {
  const frameRef = useRef(null);
  const [available, setAvailable] = useState(INVOICE_DOCUMENT_WIDTH);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return undefined;
    const measure = () => setAvailable(element.clientWidth || INVOICE_DOCUMENT_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Fit-width is the default: at 100% on a 390px screen only half the invoice
  // would be visible.
  const fitScale = Math.min(1, available / INVOICE_DOCUMENT_WIDTH);
  const scale = zoom ?? fitScale;
  const percentage = Math.round(scale * 100);

  return (
    <section className="invoice-document-preview">
      <div className="invoice-preview-tools">
        <button type="button" onClick={() => setZoom(Math.max(0.25, Number((scale - 0.1).toFixed(2))))} aria-label="Zoom out">−</button>
        <span>{percentage}%</span>
        <button type="button" onClick={() => setZoom(Math.min(2, Number((scale + 0.1).toFixed(2))))} aria-label="Zoom in">＋</button>
        <button type="button" onClick={() => setZoom(null)}>Fit Width</button>
        <span />
        {/* There were two icon buttons here that did exactly the same thing. */}
        <button type="button" onClick={() => saveInvoicePdf(html, invoiceNumber)}>⇩ Download</button>
        <button
          type="button"
          onClick={() => {
            const tab = openDocumentTab();
            presentInvoiceDocument(html, invoiceNumber, tab);
          }}
        >⎙ Print</button>
      </div>
      <div className="invoice-document-frame" ref={frameRef} style={{ height: INVOICE_PREVIEW_HEIGHT }}>
        <iframe
          title="Invoice preview"
          srcDoc={html}
          style={{
            width: INVOICE_DOCUMENT_WIDTH,
            height: INVOICE_PREVIEW_HEIGHT / scale,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </section>
  );
}

function NewInvoiceView({ currentRole, onInvoiceSent, prefillCustomer }) {
  const stores = useStores();
  const storeLabel = (key) => stores.find((store) => store.key === key)?.name || key;
  const [form, setForm] = useState({
    store: 'ikeja',
    invoiceNumber: invoiceSeed(),
    trackingToken: trackingTokenSeed(),
    invoiceDate: todayIso(),
    // An invoice stands for 48 hours, so the due date follows from the day it
    // was raised rather than being set by hand to today.
    dueDate: addDaysIso(todayIso(), 2),
    // Arrives filled in when the invoice was started from a customer profile.
    customerName: prefillCustomer?.fullName || '',
    customerPhone: prefillCustomer?.phone || '',
    customerEmail: prefillCustomer?.email || '',
    paymentStatus: '',
    paymentMethod: '',
    // What the customer actually handed over, recorded as the invoice is
    // raised. Before this the status said "part paid" with no figure behind it.
    amountReceived: '',
    storeCreditApplied: 0,
    trackingUrl: '',
    // Left empty: whatever is typed here is what the customer reads.
    notes: '',
  });
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  // The customer record behind the typed name, so the invoice knows which tier
  // they are on without the person raising it having to say.
  const [chosenCustomer, setChosenCustomer] = useState(prefillCustomer || null);
  const [elitePercent, setElitePercent] = useState(0);
  const customerSuggestionsRef = useRef(null);

  useEffect(() => {
    api.get('/oms/customers')
      .then((response) => setCustomers(response.data?.data?.customers || []))
      .catch(() => {});
  }, []);

  // The discount an elite member gets is whatever the Memberships screen says
  // it is, so changing it there changes it on every invoice raised afterwards.
  useEffect(() => {
    if (!isEliteCustomer(chosenCustomer)) { setElitePercent(0); return; }
    api.get('/oms/membership-tiers')
      .then((response) => {
        const tiers = response.data?.data?.tiers || [];
        const elite = tiers.find((tier) => /elite/i.test(tier.name || tier.id || ''));
        setElitePercent(Number(elite?.discountPercent || 0));
      })
      .catch(() => setElitePercent(0));
  }, [chosenCustomer]);

  const customerSuggestions = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c) =>
      c.fullName?.toLowerCase().includes(q) || c.phone?.includes(q)
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const selectCustomer = (customer) => {
    setChosenCustomer(customer);
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

  // Only lines that reach the invoice count toward it. A row with a rate but no
  // description was adding to the total while never appearing on the document,
  // so the printed figures could not be reconciled by hand.
  const billableItems = items.filter((item) => item.description.trim());
  const subtotal = billableItems.reduce((sum, item) => sum + (toNumber(item.rate) * toNumber(item.quantity)), 0);
  const itemDiscountTotal = billableItems.reduce((sum, item) => {
    const gross = toNumber(item.rate) * toNumber(item.quantity);
    return sum + ((gross * toNumber(item.discountPercent)) / 100);
  }, 0);
  // The elite discount follows the customer's membership rather than being
  // typed in — see the tier the customer is on, resolved below.
  const eliteDiscountAmount = Math.round(((subtotal - itemDiscountTotal) * elitePercent) / 100);
  const balanceDue = Math.max(subtotal - itemDiscountTotal - eliteDiscountAmount - toNumber(form.storeCreditApplied), 0);
  // `balanceDue` is what the invoice comes to — the server stores it as the
  // invoice total. What is still owed is that less whatever the customer has
  // just handed over, and nothing used to subtract it: a fully paid invoice
  // showed, and emailed, the whole sum as outstanding.
  const amountPaidNow = form.paymentStatus === 'fully_paid' && !toNumber(form.amountReceived)
    ? balanceDue
    : Math.min(toNumber(form.amountReceived), balanceDue);
  const outstanding = Math.max(balanceDue - amountPaidNow, 0);

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
    // The key, not the label. Sending "Fully Paid" where the server expects
    // "fully_paid" fell through its default and stored the invoice as part
    // paid — on the record and on the emailed invoice both.
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
    // Fully paid means the whole balance unless a smaller figure was typed.
    amountReceived: amountPaidNow,
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
    if (!form.customerName.trim()) return 'Select a customer.';
    if (!items.some((item) => item.description.trim())) return 'Add at least one invoice item.';
    if (evidenceRequired && !paymentEvidence) return 'Upload payment evidence for a partially or fully paid invoice.';
    // A part paid invoice with no figure is what left Accounts unable to
    // reconcile and production unable to tell whether it may start.
    const received = toNumber(form.amountReceived);
    if (form.paymentStatus === 'partial_paid' && received <= 0) {
      return 'Enter how much the customer paid.';
    }
    if (received > balanceDue) {
      return `That is more than the ${money.format(balanceDue)} this invoice comes to.`;
    }
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
        store: storeLabel(payload.store).replace(/\s+Store$/i, ''),
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
      {previewTab === 'invoice' ? <InvoiceDocumentPreview html={previewHtml} invoiceNumber={form.invoiceNumber} /> : <section className="email-preview-layout"><main><dl><dt>From:</dt><dd>The Way It Fits &lt;info@twif.com&gt;</dd><dt>To:</dt><dd>{form.customerEmail}</dd><dt>Subject:</dt><dd>Your twif Invoice {form.invoiceNumber}</dd></dl><article><div className="email-logo">twif</div><h2>Your Invoice is Ready</h2><p>Hello {form.customerName.split(' ')[0] || 'Customer'},</p><p>Thank you for choosing The Way It Fits. Your invoice has been prepared and is attached below.</p><section>{[['Invoice Number', form.invoiceNumber], [outstanding > 0 ? 'Amount Due' : 'Paid In Full', money.format(outstanding > 0 ? outstanding : balanceDue)], ['Due Date', new Date(`${form.dueDate}T00:00:00`).toLocaleDateString('en-GB')], ['Status', paymentStatusLabels[form.paymentStatus]]].map(([label,value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</section><div>{/* These two are part of the picture of the email, not controls on this screen — clicking them here did nothing. */}<span>Download Invoice PDF</span><span>Track Your Order</span></div><h3>Order Summary</h3>{items.filter((item) => item.description).map((item) => <p className="email-order-line" key={item.id}><span>{item.description} × {item.quantity}</span><strong>{money.format(item.amount)}</strong></p>)}<p className="email-balance"><span>{outstanding > 0 ? 'Balance Due' : 'Paid In Full'}</span><strong>{money.format(outstanding > 0 ? outstanding : balanceDue)}</strong></p></article></main><aside><h3>Email Details</h3><dl><dt>Recipient</dt><dd>{form.customerEmail}</dd><dt>Subject</dt><dd>Your twif Invoice {form.invoiceNumber}</dd><dt>Attachment</dt><dd>{form.invoiceNumber}.pdf</dd><dt>Tracking Link</dt><dd>✓ Will be included</dd><dt>Payment Evidence</dt><dd>{paymentEvidence?.name || 'Not required'}</dd></dl></aside></section>}
      {message ? <div className="invoice-message">{message}</div> : null}
      <footer><button type="button" onClick={() => setPreviewMode(false)}>Back</button><div><button onClick={() => saveInvoicePdf(previewHtml, form.invoiceNumber)}>⇩ &nbsp; Download PDF</button><button onClick={() => setPreviewTab('email')}>✉ &nbsp; Preview Email</button><button className="primary-action" onClick={sendInvoice} disabled={sending}>{sending ? 'Sending…' : '➤  Send Invoice'}</button></div></footer>
    </div>;
  }

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <FileText size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>New Invoice</h2>
            <p>Create and send a customer invoice</p>
          </div>
        </div>
        {form.customerName && (
          <div className="os-linked-badge">
            <CheckCircle size={13} />
            Billing <strong>{form.customerName}</strong>
          </div>
        )}
      </div>

      <div className="os-layout">
        <form className="os-form" onSubmit={(e) => { e.preventDefault(); sendInvoice(); }}>

          {/* Step 1: Customer Info */}
          <div className="os-card">
            <div className="os-card-head">
              <span className="os-step-num">1</span>
              <div><strong>Customer Info</strong><p>Search or enter the customer details and sending store</p></div>
              <Users size={16} strokeWidth={1.5} className="os-card-icon" />
            </div>
            <div className="os-card-body os-grid-2">
              <label className="os-field">
                <span>Customer Name</span>
                <div className="customer-search-wrap" ref={customerSuggestionsRef} style={{ position: 'relative' }}>
                  <input
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    value={form.customerName}
                    onChange={(event) => { updateForm('customerName', event.target.value); setCustomerSearch(event.target.value); }}
                    onFocus={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Search or type customer name…"
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
              <label className="os-field">
                <span>Customer Phone</span>
                <input value={form.customerPhone} onChange={(event) => updateForm('customerPhone', event.target.value)} placeholder="e.g. 08012345678" />
              </label>
              <label className="os-field os-field-full">
                <span>Customer Email</span>
                <input type="email" value={form.customerEmail} onChange={(event) => updateForm('customerEmail', event.target.value)} placeholder="customer@email.com" />
              </label>
              <label className="os-field">
                <span>Sending Store</span>
                <select value={form.store} onChange={(event) => updateForm('store', event.target.value)}>
                  {stores.map((store) => <option key={store.key} value={store.key}>{store.name}</option>)}
                </select>
              </label>
              <label className="os-field">
                <span>Invoice Number</span>
                <input value={form.invoiceNumber} readOnly style={{ background: '#faf7f3', color: '#8a7a6a', cursor: 'default' }} />
              </label>
            </div>
          </div>

          {/* Step 2: Invoice Items */}
          <div className="os-card">
            <div className="os-card-head">
              <span className="os-step-num">2</span>
              <div><strong>Invoice Items</strong><p>Add items, rates, quantities and optional notes</p></div>
              <Tag size={16} strokeWidth={1.5} className="os-card-icon" />
            </div>
            <div className="os-card-body" style={{ gap: 12 }}>
              {items.map((item, index) => (
                <div key={item.id} className="invoice-item-row" style={{ border: '1px solid #eee5da', borderRadius: 10, padding: '14px 16px', background: '#faf7f3', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Five columns fit a desktop and nothing else — on a phone the
                      description shrank to about six characters and the headings
                      ran into each other. The widths now live in the stylesheet. */}
                  <div className="invoice-item-fields">
                    <label className="os-field">
                      <span>Description</span>
                      <input value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} placeholder="e.g. Three-piece suit" />
                    </label>
                    <label className="os-field">
                      <span>Rate (₦)</span>
                      <input type="number" value={item.rate} onChange={(event) => updateItem(index, 'rate', event.target.value)} />
                    </label>
                    <label className="os-field">
                      <span>Qty</span>
                      <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
                    </label>
                    <label className="os-field">
                      <span>Discount %</span>
                      <input type="number" min="0" max="100" value={item.discountPercent} onChange={(event) => updateItem(index, 'discountPercent', event.target.value)} />
                    </label>
                    <label className="os-field">
                      <span>Amount</span>
                      <input readOnly value={money.format(toNumber(item.amount))} style={{ background: '#faf7f3', fontWeight: 700, color: '#1a1611', cursor: 'default' }} />
                    </label>
                  </div>
                  <div className="invoice-item-note-row">
                    <label className="os-field">
                      <span>Item Note <em style={{ fontWeight: 400, fontSize: 10, textTransform: 'none' }}>(optional)</em></span>
                      <input value={item.note} onChange={(event) => updateItem(index, 'note', event.target.value)} placeholder="Delivery date, style details…" />
                    </label>
                    <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1}
                      style={{ padding: '10px 14px', background: items.length === 1 ? '#faf7f3' : '#fff5f0', border: '1px solid', borderColor: items.length === 1 ? '#eee5da' : '#f3d5cc', borderRadius: 8, color: items.length === 1 ? '#b0a090' : '#8a3520', cursor: items.length === 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem}
                style={{ padding: '10px 16px', border: '1px dashed #ddd5c8', borderRadius: 8, background: '#fff', color: '#c97b08', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>

          {/* Step 3: Pricing & Payment */}
          <div className="os-card">
            <div className="os-card-head">
              <span className="os-step-num">3</span>
              <div><strong>Pricing &amp; Payment</strong><p>Set payment status, method and apply any discounts</p></div>
              <CreditCard size={16} strokeWidth={1.5} className="os-card-icon" />
            </div>
            <div className="os-card-body os-grid-2">
              <label className="os-field">
                <span>Payment Status <span style={{ color: '#d62828' }}>*</span></span>
                <select value={form.paymentStatus} onChange={(event) => updateForm('paymentStatus', event.target.value)}>
                  <option value="" disabled>— Select status —</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial_paid">Partial Paid</option>
                  <option value="fully_paid">Fully Paid</option>
                </select>
              </label>
              <label className="os-field">
                <span>Payment Method</span>
                <select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)}>
                  <option value="" disabled>— Select method —</option>
                  <option value="transfer">Transfer</option>
                  <option value="card">Card</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                </select>
              </label>
              {/* There was nowhere to write down what the customer paid, so an
                  invoice could say "part paid" with no figure behind it. An
                  unpaid invoice has no amount to record, so the field only
                  makes sense once some payment status is selected. */}
              {form.paymentStatus && form.paymentStatus !== 'unpaid' ? (
                <label className="os-field">
                  <span>Amount Received (₦){form.paymentStatus === 'partial_paid' ? <span style={{ color: '#d62828' }}> *</span> : null}</span>
                  <input
                    type="number"
                    min="0"
                    max={balanceDue}
                    value={form.amountReceived}
                    onChange={(event) => updateForm('amountReceived', event.target.value)}
                    placeholder={form.paymentStatus === 'fully_paid' ? String(balanceDue) : '0'}
                  />
                </label>
              ) : null}
              <label className="os-field">
                <span>Store Credit Applied (₦)</span>
                <input type="number" min="0" value={form.storeCreditApplied} onChange={(event) => updateForm('storeCreditApplied', event.target.value)} />
              </label>
              <label className="os-field">
                <span>Invoice Date</span>
                <input type="date" value={form.invoiceDate} onChange={(event) => updateForm('invoiceDate', event.target.value)} />
              </label>
              <label className="os-field">
                <span>Due Date</span>
                <input type="date" value={form.dueDate} onChange={(event) => updateForm('dueDate', event.target.value)} />
              </label>
              {evidenceRequired ? (
                <label className="os-field os-field-full">
                  <span>Payment Evidence <span style={{ color: '#d62828' }}>*</span></span>
                  <div style={{ border: '1px dashed #ddd5c8', borderRadius: 8, padding: 14, background: '#faf7f3' }}>
                    {/* iOS offers Take Photo alongside the library from a
                        single input; Android often shows only the library, so
                        the camera was unreachable at the counter. Two explicit
                        choices behave the same way on both. */}
                    <div className="evidence-picker">
                      <label>
                        <Camera size={14} strokeWidth={1.8} />
                        Take a photo
                        <input type="file" accept="image/*" capture="environment" onChange={selectEvidence} />
                      </label>
                      <label>
                        <Image size={14} strokeWidth={1.8} />
                        Choose a file
                        <input type="file" accept="image/*" onChange={selectEvidence} />
                      </label>
                    </div>
                    {paymentEvidence && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <img src={paymentEvidence.dataUrl} alt="Payment evidence preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee5da' }} />
                        <span style={{ fontSize: 12, color: '#5a4e42', flex: 1 }}>{paymentEvidence.name}</span>
                        <button type="button" onClick={() => setPaymentEvidence(null)} style={{ padding: '4px 10px', border: '1px solid #f3d5cc', borderRadius: 6, background: '#fff5f0', color: '#8a3520', fontSize: 11, cursor: 'pointer' }}>Remove</button>
                      </div>
                    )}
                    {!paymentEvidence && <p style={{ fontSize: 12, color: '#8a7a6a', marginTop: 6, marginBottom: 0 }}>Upload a receipt screenshot or payment photo (max 5 MB)</p>}
                  </div>
                </label>
              ) : (
                <div className="os-field-full" style={{ padding: '10px 14px', background: '#faf7f3', borderRadius: 8, fontSize: 12, color: '#8a7a6a', border: '1px solid #eee5da' }}>
                  No payment evidence required for an unpaid invoice.
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Notes & Tracking */}
          <div className="os-card">
            <div className="os-card-head">
              <span className="os-step-num">4</span>
              <div><strong>Notes &amp; Tracking</strong><p>Additional notes included in the invoice email</p></div>
              <Edit2 size={16} strokeWidth={1.5} className="os-card-icon" />
            </div>
            <div className="os-card-body">
              <label className="os-field os-field-full invoice-notes-field">
                <span>Invoice Notes</span>
                <textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} rows={4} />
              </label>
              <label className="os-field os-field-full">
                <span>Tracking Link</span>
                <input readOnly value={trackingUrlForToken(form.trackingToken)} style={{ background: '#faf7f3', color: '#8a7a6a', cursor: 'default', fontSize: 12 }} />
              </label>
            </div>
          </div>

          {message ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: message.includes('sent') || message.includes('Sent') ? '#f0faf4' : '#fff5f0', border: '1px solid', borderColor: message.includes('sent') || message.includes('Sent') ? '#c3e8d4' : '#f3d5cc', fontSize: 13, color: message.includes('sent') || message.includes('Sent') ? '#2a7d4f' : '#8a3520' }}>
              {message.includes('sent') || message.includes('Sent') ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{message}</span>
            </div>
          ) : null}

          <button className="os-release-btn" type="submit" disabled={sending}>
            <CheckCircle size={17} strokeWidth={2} />
            {sending ? 'Sending Invoice…' : 'Send Invoice'}
          </button>
        </form>

        {/* Sidebar */}
        <aside className="os-sidebar">
          <div className="os-summary-card">
            <header>
              <FileText size={14} strokeWidth={1.5} />
              <h3>Invoice Preview</h3>
            </header>
            <dl>
              <dt>Invoice #</dt>
              <dd style={{ fontFamily: 'monospace', fontSize: 11 }}>{form.invoiceNumber}</dd>
              <dt>Store</dt>
              <dd>{storeLabel(form.store)}</dd>
              <dt>Bill To</dt>
              <dd>{form.customerName || <span className="os-empty">—</span>}</dd>
              <dt>Email</dt>
              <dd style={{ fontSize: 11 }}>{form.customerEmail || <span className="os-empty">Not set</span>}</dd>
              <dt>Payment</dt>
              <dd><Status>{paymentStatusLabels[form.paymentStatus] || '—'}</Status></dd>
              <dt>Method</dt>
              <dd>{form.paymentMethod ? form.paymentMethod.charAt(0).toUpperCase() + form.paymentMethod.slice(1) : <span className="os-empty">—</span>}</dd>
              <dt>Subtotal</dt>
              <dd>{money.format(subtotal)}</dd>
              {itemDiscountTotal > 0 && <><dt>Item discounts</dt><dd style={{ color: '#2a7d4f' }}>-{money.format(itemDiscountTotal)}</dd></>}
              {eliteDiscountAmount > 0 && <><dt>Elite discount</dt><dd style={{ color: '#2a7d4f' }}>-{money.format(eliteDiscountAmount)}</dd></>}
              {toNumber(form.storeCreditApplied) > 0 && <><dt>Store credit</dt><dd style={{ color: '#2a7d4f' }}>-{money.format(toNumber(form.storeCreditApplied))}</dd></>}
              {amountPaidNow > 0 && <><dt>Invoice total</dt><dd>{money.format(balanceDue)}</dd></>}
              {amountPaidNow > 0 && <><dt>Amount paid</dt><dd style={{ color: '#2a7d4f' }}>-{money.format(amountPaidNow)}</dd></>}
            </dl>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee5da', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.06em', fontWeight: 700 }}>{outstanding > 0 ? 'Balance Due' : 'Paid In Full'}</span>
              <strong style={{ fontSize: 18, color: '#1a1611' }}>{money.format(outstanding > 0 ? outstanding : balanceDue)}</strong>
            </div>
          </div>
          <button type="button" onClick={previewInvoice}
            style={{ width: '100%', padding: '10px 16px', border: '1px solid #ddd5c8', borderRadius: 10, background: '#fff', color: '#5a4e42', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Eye size={14} /> Preview Invoice
          </button>
          {previewHtml && (
            <iframe className="invoice-preview-frame" title="Invoice email preview" srcDoc={previewHtml} style={{ width: '100%', height: 200, border: '1px solid #eee5da', borderRadius: 10, marginTop: 4 }} />
          )}
          <div className="os-sidebar-note">
            <AlertCircle size={13} strokeWidth={1.5} />
            <p>Customer will receive an email with the invoice PDF and order tracking link.</p>
          </div>
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
  const paymentKpiRef = useRef(null);
  const [activePaymentKpiDot, setActivePaymentKpiDot] = useState(0);
  const PAYMENT_KPI_COUNT = 4;
  const handlePaymentKpiScroll = () => {
    if (!paymentKpiRef.current) return;
    const { scrollLeft, scrollWidth } = paymentKpiRef.current;
    setActivePaymentKpiDot(Math.round(scrollLeft / (scrollWidth / PAYMENT_KPI_COUNT)));
  };
  const totalValue = invoiceQueue.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const paidValue = invoiceQueue.filter((invoice) => invoice.paymentStatus === 'Fully Paid').reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const filteredQueue = invoiceQueue.filter((invoice) => {
    const approvalMatches = approvalFilter === 'all'
      || (approvalFilter === 'pending' && invoiceApprovalStatus(invoice) === 'Pending Accounts')
      || (approvalFilter === 'approved' && isInvoiceApproved(invoice));
    const paymentMatches = paymentFilter === 'all'
      || (paymentFilter === 'partial' && invoice.paymentStatus === 'Partial Paid')
      || (paymentFilter === 'completed' && invoice.paymentStatus === 'Fully Paid');
    return approvalMatches && paymentMatches;
  });

  const outstandingValue = invoiceQueue.reduce((sum, inv) => {
    if (inv.paymentStatus === 'Fully Paid') return sum;
    const paid = toNumber(inv.paid || inv.amountPaid || (inv.paymentStatus === 'Partial Paid' ? toNumber(inv.total) / 2 : 0));
    return sum + Math.max(toNumber(inv.total) - paid, 0);
  }, 0);

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <CreditCard size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Payments</h2>
            <p>Invoice approval queue and payment tracking</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="os-kpi-row" style={{ gap: 14 }}>
        {[
          { label: 'Total Revenue', value: money.format(totalValue), detail: `${invoiceQueue.length} invoices`, icon: <TrendingUp size={16} />, color: '#c97b08' },
          { label: 'Fully Paid', value: money.format(paidValue), detail: `${completedCount} invoices`, icon: <CheckCircle size={16} />, color: '#2a7d4f' },
          { label: 'Partial Paid', value: String(partialCount), detail: 'Outstanding balances', icon: <Clock size={16} />, color: '#7a6030' },
          { label: 'Outstanding', value: money.format(outstandingValue), detail: 'Awaiting collection', icon: <AlertCircle size={16} />, color: '#8a3520' },
        ].map(({ label, value, detail, icon, color }) => (
          <div key={label} className="os-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
              <span style={{ color }}>{icon}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1611', marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#8a7a6a' }}>{detail}</div>
          </div>
        ))}
      </div>

      {/* Payment Queue Table */}
      <div className="os-card">
        <div className="os-card-head">
          <CreditCard size={16} strokeWidth={1.5} style={{ color: '#c0a87a' }} />
          <div><strong>Payment Approval Queue</strong><p>{filteredQueue.length} invoices shown</p></div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 12, color: '#5a4e42', background: '#fff', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All approvals ({invoiceQueue.length})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="approved">Approved ({approvedCount})</option>
            </select>
            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 12, color: '#5a4e42', background: '#fff', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All payments ({invoiceQueue.length})</option>
              <option value="partial">Partial ({partialCount})</option>
              <option value="completed">Completed ({completedCount})</option>
            </select>
          </div>
        </div>

        {/* Approval tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #eee5da', padding: '0 18px' }}>
          {[
            { key: 'all', label: `All (${invoiceQueue.length})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'approved', label: `Approved (${approvedCount})` },
          ].map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setApprovalFilter(key)}
              style={{ padding: '10px 14px', border: 'none', borderBottom: approvalFilter === key ? '2px solid #c97b08' : '2px solid transparent', background: 'none', fontSize: 13, fontWeight: approvalFilter === key ? 700 : 400, color: approvalFilter === key ? '#1a1611' : '#8a7a6a', cursor: 'pointer', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Invoice', 'Customer', 'Store', 'Total', 'Paid', 'Balance', 'Method', 'Date', 'Status', 'Actions'].map((col) => (
                  <th key={col} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.08em', background: '#faf7f3', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length > 0 ? filteredQueue.map((invoice) => {
                const paidAmt = toNumber(invoice.paid || invoice.amountPaid || (invoice.paymentStatus === 'Fully Paid' ? invoice.total : invoice.paymentStatus === 'Partial Paid' ? toNumber(invoice.total) / 2 : 0));
                const balance = Math.max(toNumber(invoice.total) - paidAmt, 0);
                return (
                  <tr key={invoice.invoiceNumber} style={{ borderBottom: '1px solid #f3ede5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <strong style={{ fontFamily: 'monospace', fontSize: 11, color: '#c97b08' }}>{invoice.invoiceNumber}</strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3ede5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#5a4e42', flexShrink: 0 }}>
                          {(invoice.customer || '').split(' ').map(p => p[0]).join('').slice(0, 2)}
                        </span>
                        <span style={{ fontWeight: 600, color: '#1a1611' }}>{invoice.customer}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{invoice.store}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}><strong>{money.format(invoice.total)}</strong></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#2a7d4f', fontWeight: 600 }}>{money.format(paidAmt)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: balance > 0 ? '#8a3520' : '#2a7d4f', fontWeight: 600 }}>{balance > 0 ? money.format(balance) : '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{invoice.paymentMethod || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a', whiteSpace: 'nowrap' }}>
                      {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}><Status>{invoiceApprovalStatus(invoice)}</Status></td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Flagged')}
                          style={{ padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#7a6030', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={11} /> Flag
                        </button>
                        <button type="button" onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Approved')} disabled={isInvoiceApproved(invoice)}
                          style={{ padding: '5px 10px', border: '1px solid', borderColor: isInvoiceApproved(invoice) ? '#c3e8d4' : '#1a1611', borderRadius: 6, background: isInvoiceApproved(invoice) ? '#f0faf4' : '#1a1611', color: isInvoiceApproved(invoice) ? '#2a7d4f' : '#fff', fontSize: 12, fontWeight: 600, cursor: isInvoiceApproved(invoice) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> {isInvoiceApproved(invoice) ? 'Approved' : 'Approve'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 13 }}>
                    No invoices match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="payments-mobile-list" style={{ display: 'none' }}>
          {filteredQueue.map((invoice) => {
            const paidAmt = toNumber(invoice.paid || invoice.amountPaid || (invoice.paymentStatus === 'Fully Paid' ? invoice.total : invoice.paymentStatus === 'Partial Paid' ? toNumber(invoice.total) / 2 : 0));
            const balance = Math.max(toNumber(invoice.total) - paidAmt, 0);
            return (
              <div key={invoice.invoiceNumber} style={{ padding: '14px 16px', borderBottom: '1px solid #f3ede5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#c97b08', marginBottom: 2 }}>{invoice.invoiceNumber}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{invoice.customer}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>{invoice.store}</div>
                  </div>
                  <Status>{invoiceApprovalStatus(invoice)}</Status>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid #f3ede5', marginBottom: 10 }}>
                  <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>Total</div><div style={{ fontWeight: 700, fontSize: 13 }}>{money.format(invoice.total)}</div></div>
                  <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>Paid</div><div style={{ fontWeight: 700, fontSize: 13, color: '#2a7d4f' }}>{money.format(paidAmt)}</div></div>
                  <div><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#b0a090', letterSpacing: '0.06em' }}>Balance</div><div style={{ fontWeight: 700, fontSize: 13, color: balance > 0 ? '#8a3520' : '#2a7d4f' }}>{balance > 0 ? money.format(balance) : '—'}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Flagged')}
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#7a6030', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Flag
                  </button>
                  <button type="button" onClick={() => onApproveInvoice?.(invoice.invoiceNumber, 'Approved')} disabled={isInvoiceApproved(invoice)}
                    style={{ flex: 2, padding: '8px', border: '1px solid', borderColor: isInvoiceApproved(invoice) ? '#c3e8d4' : '#1a1611', borderRadius: 6, background: isInvoiceApproved(invoice) ? '#f0faf4' : '#1a1611', color: isInvoiceApproved(invoice) ? '#2a7d4f' : '#fff', fontSize: 12, fontWeight: 600, cursor: isInvoiceApproved(invoice) ? 'default' : 'pointer' }}>
                    {isInvoiceApproved(invoice) ? 'Approved' : 'Approve Payment'}
                  </button>
                </div>
              </div>
            );
          })}
          {!filteredQueue.length && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8a7a6a', fontSize: 13 }}>
              No invoices match the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// One invoice can cover several garments, so the per-garment fields live in a
// list. The invoice, customer and store stay at the top level because they
// belong to the order as a whole.
const emptyOrderItem = () => ({
  key: `item-${Math.random().toString(36).slice(2, 9)}`,
  item: '',
  pieces: 1,
  delivery: todayIso(),
  // Fabric is chosen by Production or Inventory, not by the store raising the
  // sheet, so it starts at Nil and the sheet can be completed without it.
  // Several fabrics can go into one garment — a shell and a lining, say — so
  // each carries its own quantity. Empty is fine: choosing fabric is
  // Production's or Inventory's job, not the store's.
  fabrics: [],
  fabric: '',
  fabricId: '',
  fabricUnit: '',
  designNotes: '',
  styleImages: [null, null, null, null, null],
  department: '',
  departmentFields: {},
});

const emptySheetForm = () => ({
  invoiceNumber: '',
  trackingToken: '',
  trackingUrl: '',
  customer: '',
  customerId: '',
  store: 'Ikeja',
  itemNote: '',
  // One set of measurements for the whole order rather than one per garment.
  // It is taken from the customer's profile and may be adjusted here for this
  // order; changing it does not touch the profile.
  measurements: '',
  measurementDetails: {},
  items: [emptyOrderItem()],
});

function OrderSheetView({ sentInvoices = [], onCreateJob }) {
  // Arriving from an invoice — "raise an order sheet for this one" — rather
  // than from the menu, so the picker does not have to be searched again.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedInvoice = searchParams.get('invoice');
  const departments = useDepartments();
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [sheetForm, setSheetForm] = useState(emptySheetForm);
  const [customers, setCustomers] = useState([]);
  const [message, setMessage] = useState('');

  // Measurements come from the customer's own profile rather than being typed
  // in fresh for every order, so the figures a tailor works to are the figures
  // the shop took.
  useEffect(() => {
    api.get('/oms/customers')
      .then((response) => setCustomers(response.data?.data?.customers || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/oms/fabrics')
      .then((response) => {
        if (!active) return;
        setInventory(response.data?.data?.fabrics || []);
      })
      .catch(() => setMessage('Unable to load fabrics from inventory.'))
      .finally(() => active && setInventoryLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!requestedInvoice || sheetForm.invoiceNumber === requestedInvoice) return;
    // Both lists have to be in before the invoice can be matched to a customer
    // profile. Waiting for them rather than trying early matters because the
    // parameter is cleared once it has been used — an attempt made too soon
    // would clear it and lose the selection for good.
    if (!sentInvoices.length || !customers.length) return;
    if (selectInvoice(requestedInvoice)) setSearchParams({}, { replace: true });
    // selectInvoice is rebuilt on every render; the invoice number is what
    // decides whether this still has anything to do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedInvoice, sentInvoices, customers]);

  const updateSheetForm = (field, value) => {
    setSheetForm((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (index, changes) => {
    setSheetForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
    }));
  };

  const updateDepartmentField = (index, fieldKey, value) => {
    setSheetForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index
        ? { ...item, departmentFields: { ...item.departmentFields, [fieldKey]: value } }
        : item)),
    }));
  };

  const addItem = () => setSheetForm((current) => ({ ...current, items: [...current.items, emptyOrderItem()] }));

  const removeItem = (index) => setSheetForm((current) => ({
    ...current,
    items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : current.items,
  }));

  // Images are held as data URLs, matching how payment evidence is carried,
  // so they survive the invoice payload without a separate upload endpoint.
  const readStyleImage = (index, imageIndex, file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setMessage('Style images need to be under 4 MB each.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateStyleImage(index, imageIndex, {
      label: `Image ${imageIndex + 1}`,
      name: file.name,
      dataUrl: reader.result,
    });
    reader.readAsDataURL(file);
  };

  const updateStyleImage = (index, imageIndex, value) => {
    setSheetForm((current) => ({
      ...current,
      items: current.items.map((item, itemIdx) => (itemIdx === index
        ? { ...item, styleImages: item.styleImages.map((image, i) => (i === imageIndex ? value : image)) }
        : item)),
    }));
  };

  // The board, the tracking page and the tailor's list were all built around a
  // single fabric name, so the first choice is mirrored onto the old fields and
  // they keep working unchanged.
  const withFabricSummary = (fabrics) => {
    const [first] = fabrics;
    return {
      fabrics,
      fabric: first?.name || '',
      fabricId: first?.fabricId || '',
      fabricUnit: first?.unit || '',
      fabricUsage: first?.quantity || '',
    };
  };

  const addFabric = (index, fabricId) => {
    if (!fabricId) return;
    const current = sheetForm.items[index].fabrics || [];
    if (current.some((entry) => entry.fabricId === fabricId || (fabricId === 'client-supplied' && entry.clientSupplied))) return;

    const chosen = fabricId === 'client-supplied'
      ? { fabricId: '', name: 'Client supplied', unit: '', quantity: '', clientSupplied: true }
      : (() => {
        const item = inventory.find((fabric) => fabric.id === fabricId);
        return item ? { fabricId: item.id, name: item.name, unit: item.unit, quantity: '' } : null;
      })();
    if (!chosen) return;

    updateItem(index, withFabricSummary([...current, chosen]));
  };

  const updateFabricQuantity = (index, fabricId, quantity) => {
    const next = (sheetForm.items[index].fabrics || []).map((entry) => (
      entry.fabricId === fabricId ? { ...entry, quantity } : entry
    ));
    updateItem(index, withFabricSummary(next));
  };

  const removeFabric = (index, fabricId) => {
    const next = (sheetForm.items[index].fabrics || []).filter((entry) => entry.fabricId !== fabricId);
    updateItem(index, withFabricSummary(next));
  };

  // Invoices with no order sheet yet — the ones this page exists to deal with.
  const awaitingSheet = sentInvoices.filter((invoice) => !invoice.orderSheet?.status);

  // A customer counts as having a profile when there is a real record for them,
  // rather than a name that only exists because an invoice was raised.
  const profileFor = (invoice) => customers.find((customer) => (
    !String(customer.id).startsWith('sent-')
    && (customer.fullName === invoice.customer
      || (invoice.customerEmail && customer.email === invoice.customerEmail))
  ));

  const selectInvoice = (invoiceNumber) => {
    const invoice = sentInvoices.find((item) => item.invoiceNumber === invoiceNumber);
    if (!invoice) {
      updateSheetForm('invoiceNumber', '');
      return false;
    }

    const profile = profileFor(invoice);
    if (!profile) {
      setSheetForm((current) => ({ ...current, invoiceNumber: '' }));
      setMessage(`${invoice.customer} has no customer profile yet. Create one — with their measurements — before raising an order sheet.`);
      return false;
    }
    setMessage('');

    // Whatever the shop measured, in the order the measurement sheet lists it.
    const stored = profile.measurements || {};
    const measurementDetails = Object.fromEntries(
      Object.entries(stored).filter(([key, value]) => key !== 'profile' && String(value ?? '').trim())
    );
    const written = Object.entries(measurementDetails)
      .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
      .join(', ');

    const resolvedToken = invoice.trackingToken || trackingTokenSeed();

    // Prefill one garment row per line on the invoice, so a five-item invoice
    // does not have to be re-typed by hand.
    const invoiceItems = Array.isArray(invoice.items) && invoice.items.length ? invoice.items : null;

    setSheetForm((current) => ({
      ...current,
      invoiceNumber,
      trackingToken: resolvedToken,
      trackingUrl: invoice.trackingUrl || trackingUrlForToken(resolvedToken),
      customer: invoice.customer || '',
      customerId: profile.id,
      store: invoice.store || current.store,
      itemNote: invoice.itemNote || current.itemNote,
      measurements: written,
      measurementDetails,
      items: invoiceItems
        ? invoiceItems.map((line) => ({
          ...emptyOrderItem(),
          item: line.description || line.name || '',
          pieces: toNumber(line.quantity) || 1,
          delivery: dateInputValue(invoice.deliveryDate),
          designNotes: line.note || invoice.itemNote || '',
        }))
        : current.items.map((item, index) => (index === 0 ? {
          ...item,
          item: invoice.item || item.item,
          pieces: invoice.pieces || item.pieces,
          delivery: dateInputValue(invoice.deliveryDate, item.delivery),
          designNotes: invoice.itemNote || item.designNotes,
        } : item)),
    }));
    return true;
  };

  const submitOrderSheet = async (event) => {
    event.preventDefault();
    const items = sheetForm.items.map((item) => ({ ...item, item: item.item.trim() }));

    if (!sheetForm.invoiceNumber || !sheetForm.customer.trim()) {
      setMessage('Select an invoice and confirm the customer before releasing the order sheet.');
      return;
    }
    // Fabric is Production's and Inventory's to choose, so a sheet can be
    // released without one — this still demanded it, which made the Nil option
    // decorative: you could pick it and then not save.
    const incomplete = items.findIndex((item) => !item.item);
    if (incomplete !== -1) {
      setMessage(`Item ${incomplete + 1} needs a garment name before the order sheet can be released.`);
      return;
    }

    // A fabric chosen with no quantity against it tells Inventory nothing.
    const missingQuantity = items.findIndex((item) => (item.fabrics || [])
      .some((entry) => !entry.clientSupplied && !(Number(entry.quantity) > 0)));
    if (missingQuantity !== -1) {
      setMessage(`Item ${missingQuantity + 1} has a fabric with no quantity against it. Say how much is needed, or take it off.`);
      return;
    }

    const styleImagesFor = (item) => item.styleImages
      .map((image, index) => (image ? { ...image, label: image.label || `Image ${index + 1}` } : null))
      .filter(Boolean);

    const [firstItem] = items;
    const orderSheet = {
      id: `JOB-${Date.now().toString().slice(-6)}`,
      invoiceNumber: sheetForm.invoiceNumber,
      trackingToken: sheetForm.trackingToken,
      trackingUrl: sheetForm.trackingUrl,
      customer: sheetForm.customer.trim(),
      // Kept so the order can find its customer again later — two customers can
      // share a name, and measurements taken after the sheet was raised are
      // looked up against this.
      customerId: sheetForm.customerId || '',
      phone: '',
      store: sheetForm.store,
      amount: 0,
      paid: 0,
      status: 'Order Sheet Confirmed',
      requiresAccountApproval: true,
      payment: 'Fully Paid',
      tailor: 'Unassigned',
      productionNote: '',
      fabricConfirmed: false,
      // Every garment on the order, each with its own fabric and measurements.
      // The React list key is dropped — it is a rendering concern, not data.
      items: items.map((item) => {
        const { key: _listKey, ...rest } = item;
        return { ...rest, styleImages: styleImagesFor(item) };
      }),
      // The first garment is also mirrored onto the top level so the production
      // queue, tailor task list and customer tracking page keep working
      // unchanged for the common single-item order.
      item: firstItem.item,
      pieces: toNumber(firstItem.pieces) || 1,
      delivery: firstItem.delivery,
      fabric: firstItem.fabric,
      fabricId: firstItem.fabricId,
      fabricUnit: firstItem.fabricUnit,
      fabricUsage: firstItem.fabricUsage || '',
      // Every fabric across every garment, so Production and Inventory can see
      // what the order needs without walking the item list.
      fabrics: items.flatMap((item) => item.fabrics || []),
      measurements: sheetForm.measurements,
      measurementDetails: sheetForm.measurementDetails,
      designNotes: firstItem.designNotes,
      images: styleImagesFor(firstItem).length,
      styleImages: styleImagesFor(firstItem),
      note: firstItem.designNotes || sheetForm.itemNote || 'Order sheet released by Store Manager.',
      assignedAt: new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    };

    // The save used to be fired and forgotten: if the server refused it, the
    // failure was swallowed and the screen still said the sheet was saved, so
    // the Store Manager would leave believing production had it.
    try {
      await api.post('/oms/tracking/order-sheet', {
        trackingToken: orderSheet.trackingToken,
        invoiceNumber: orderSheet.invoiceNumber,
        orderSheet,
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'The order sheet could not be saved. Nothing has been sent to Production.');
      return;
    }

    onCreateJob(orderSheet);
    setMessage(`Order sheet saved with ${items.length} item${items.length === 1 ? '' : 's'}. It will become visible to Production after Accounts approves the invoice.`);
    setSheetForm(emptySheetForm());
  };

  const linkedInvoice = sentInvoices.find((inv) => inv.invoiceNumber === sheetForm.invoiceNumber);

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <ClipboardList size={22} strokeWidth={1.5} />
          <div>
            <h2>Order Sheet</h2>
            <p>Create the order sheets here.</p>
          </div>
        </div>
        {sheetForm.invoiceNumber && (
          <div className="os-linked-badge">
            <CheckCircle size={13} />
            Linked to <strong>{sheetForm.invoiceNumber}</strong>
          </div>
        )}
      </div>

      <div className="os-layout">
        <form className="os-form" onSubmit={submitOrderSheet}>

          <div className="os-card">
            <div className="os-card-head">
              <span className="os-step-num">1</span>
              <div><strong>Invoice</strong><p>Link to an approved invoice to auto-fill details</p></div>
              <FileText size={16} strokeWidth={1.5} className="os-card-icon" />
            </div>
            <div className="os-card-body">
              <label className="os-field os-field-full">
                <span>Invoice Number</span>
                <select value={sheetForm.invoiceNumber} onChange={(event) => selectInvoice(event.target.value)}>
                  <option value="">Select invoice to auto-fill details...</option>
                  {sentInvoices.map((invoice) => (
                    <option key={invoice.invoiceNumber} value={invoice.invoiceNumber}>
                      {invoice.invoiceNumber} · {invoice.customer} · {invoice.store}
                    </option>
                  ))}
                </select>
              </label>
              {linkedInvoice && (
                <div className="os-invoice-chip">
                  <span className="os-avatar">{linkedInvoice.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                  <div>
                    <strong>{linkedInvoice.customer}</strong>
                    <small>{linkedInvoice.store} · {linkedInvoice.item || 'Item not specified'}</small>
                  </div>
                  <Status>{linkedInvoice.paymentStatus}</Status>
                </div>
              )}
            </div>
          </div>

          <div className="os-card">
            <div className="os-card-head">
              <span className="os-step-num">2</span>
              <div><strong>Customer &amp; Store</strong><p>Confirm who this order is for</p></div>
              <Users size={16} strokeWidth={1.5} className="os-card-icon" />
            </div>
            <div className="os-card-body os-grid-2">
              <label className="os-field">
                <span>Customer Name</span>
                <input value={sheetForm.customer} onChange={(event) => updateSheetForm('customer', event.target.value)} placeholder="Full name" />
              </label>
              <label className="os-field">
                <span>Store</span>
                <select value={sheetForm.store} onChange={(event) => updateSheetForm('store', event.target.value)}>
                  <option>Lekki</option>
                  <option>Ikeja</option>
                </select>
              </label>
            </div>
          </div>

          {/* Arriving with nothing chosen, the useful thing is the list of
              invoices still waiting for a sheet — otherwise the page is a blank
              form and a dropdown to hunt through. */}
          {!sheetForm.invoiceNumber && awaitingSheet.length ? (
            <div className="orders-awaiting">
              <div>
                <strong>{awaitingSheet.length} invoice{awaitingSheet.length === 1 ? '' : 's'} waiting for an order sheet</strong>
                <p>Pick one to fill this in, or choose any invoice from the list above.</p>
              </div>
              <div className="orders-awaiting-list">
                {awaitingSheet.slice(0, 8).map((invoice) => (
                  <button type="button" key={invoice.invoiceNumber} onClick={() => selectInvoice(invoice.invoiceNumber)}>
                    <span>{invoice.customer}</span>
                    <small>{invoice.invoiceNumber}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* One set of measurements for the whole order, taken from the
              customer's profile. Adjusting them here is for this order only —
              the profile keeps the figures the shop measured. */}
          {sheetForm.invoiceNumber ? (
            <div className="os-card">
              <div className="os-card-head">
                <Ruler size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
                <div>
                  <strong>Measurements</strong>
                  <p>From {sheetForm.customer}&apos;s profile — edit for this order only</p>
                </div>
              </div>
              <div className="os-card-body">
                {Object.keys(sheetForm.measurementDetails || {}).length ? (
                  <div className="sheet-measurements">
                    {Object.entries(sheetForm.measurementDetails).map(([key, value]) => (
                      <label className="os-field" key={key}>
                        <span>{key.replace(/_/g, ' ')}</span>
                        <input
                          value={value}
                          onChange={(event) => setSheetForm((current) => ({
                            ...current,
                            measurementDetails: { ...current.measurementDetails, [key]: event.target.value },
                          }))}
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="sheet-measurements-empty">
                    Nothing has been measured for {sheetForm.customer} yet. Take their measurements on
                    their customer profile first — a tailor cannot cut without them, and the order will
                    be held until they are there.
                  </p>
                )}
                <label className="os-field os-field-full">
                  <span>Anything else the tailor should know about the fit</span>
                  <textarea
                    value={sheetForm.measurements}
                    onChange={(event) => updateSheetForm('measurements', event.target.value)}
                    rows={2}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {sheetForm.items.map((orderItem, index) => (
            <div className="os-card os-item-card" key={orderItem.key}>
              <div className="os-card-head">
                <span className="os-step-num">{index + 1}</span>
                <div>
                  <strong>Item {index + 1}</strong>
                  <p>Garment, quantity, delivery and design notes for this piece</p>
                </div>
                {sheetForm.items.length > 1 ? (
                  <button type="button" className="os-item-remove" onClick={() => removeItem(index)}>
                    <Trash2 size={13} strokeWidth={1.8} /> Remove
                  </button>
                ) : <Package size={16} strokeWidth={1.5} className="os-card-icon" />}
              </div>

              <div className="os-card-body os-grid-3">
                <label className="os-field">
                  <span>Item / Garment</span>
                  <input value={orderItem.item} onChange={(event) => updateItem(index, { item: event.target.value })} placeholder="e.g. Three-piece suit" />
                </label>
                <label className="os-field">
                  <span>No. of Pieces</span>
                  <input type="number" min="1" value={orderItem.pieces} onChange={(event) => updateItem(index, { pieces: event.target.value })} />
                </label>
                <label className="os-field">
                  <span>Delivery Date</span>
                  <input type="date" value={orderItem.delivery} onChange={(event) => updateItem(index, { delivery: event.target.value })} />
                </label>
              </div>

              <div className="os-card-body" style={{ paddingTop: 0 }}>
                <label className="os-field os-field-full">
                  <span>Department</span>
                  <select
                    value={orderItem.department}
                    onChange={(event) => updateItem(index, { department: event.target.value, departmentFields: {} })}
                  >
                    <option value="">Select a department to enter its details…</option>
                    {departments.filter((department) => department.status === 'active').map((department) => (
                      <option key={department.key} value={department.key}>{department.name}</option>
                    ))}
                  </select>
                </label>

                {orderItem.department && DEPARTMENT_FIELDS[orderItem.department] ? (
                  <div className="os-department-fields">
                    <div className="os-grid-3">
                      {DEPARTMENT_FIELDS[orderItem.department].fields.map((field) => (
                        <label className="os-field" key={field.key}>
                          <span>{field.label}{field.required ? <span style={{ color: '#d62828' }}> *</span> : null}</span>
                          <input
                            value={orderItem.departmentFields?.[field.key] || ''}
                            onChange={(event) => updateDepartmentField(index, field.key, event.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                    {DEPARTMENT_FIELDS[orderItem.department].note ? (
                      <p className="os-department-note">{DEPARTMENT_FIELDS[orderItem.department].note}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="os-card-body os-grid-2" style={{ paddingTop: 0 }}>
                {/* One garment can take several fabrics — a shell and a lining,
                    or two colours — so they are chosen one at a time and each
                    carries how much of it this order needs. Leaving it empty is
                    still fine: the choice is Production's or Inventory's. */}
                <div className="os-field os-field-full fabric-picker">
                  <span>Fabric{inventoryLoading ? ' (loading…)' : ''}</span>

                  {(orderItem.fabrics || []).length ? (
                    <ul className="fabric-chosen">
                      {(orderItem.fabrics || []).map((entry) => {
                        const stock = inventory.find((fabric) => fabric.id === entry.fabricId);
                        const available = toNumber(stock?.quantity);
                        const wanted = toNumber(entry.quantity);
                        const short = Boolean(entry.fabricId) && wanted > available;
                        return (
                          <li key={entry.fabricId || 'client-supplied'}>
                            <div>
                              <strong>{entry.name}</strong>
                              <small>
                                {entry.clientSupplied
                                  ? 'The customer is bringing this'
                                  : `${available} ${stock?.unit || entry.unit} in stock`}
                              </small>
                            </div>
                            {entry.clientSupplied ? <span className="fabric-supplied">Customer&apos;s own</span> : (
                              <label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={entry.quantity}
                                  onChange={(event) => updateFabricQuantity(index, entry.fabricId, event.target.value)}
                                  placeholder="0"
                                  aria-label={`How much ${entry.name} this order needs`}
                                />
                                <span>{entry.unit || 'units'}</span>
                              </label>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFabric(index, entry.fabricId)}
                              aria-label={`Remove ${entry.name}`}
                            >×</button>
                            {short ? <p>Only {available} {stock?.unit} left — Inventory will refuse this when it is allocated.</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  <select
                    value=""
                    onChange={(event) => { addFabric(index, event.target.value); event.target.value = ''; }}
                    disabled={inventoryLoading}
                  >
                    <option value="">
                      {inventoryLoading
                        ? 'Loading inventory...'
                        : (orderItem.fabrics || []).length ? 'Add another fabric…' : 'Nil — Production will choose'}
                    </option>
                    <option value="client-supplied">Client supplied</option>
                    {inventory
                      .filter((fabric) => !(orderItem.fabrics || []).some((entry) => entry.fabricId === fabric.id))
                      .map((fabric) => (
                        <option key={fabric.id} value={fabric.id} disabled={toNumber(fabric.quantity) <= 0}>
                          {fabric.name} ({toNumber(fabric.quantity)} {fabric.unit}){toNumber(fabric.quantity) <= 0 ? ' · Out of stock' : ''}
                        </option>
                      ))}
                  </select>

                  <span className="os-fabric-hint">
                    <Package size={11} />
                    {(orderItem.fabrics || []).length
                      ? `${orderItem.fabrics.length} fabric${orderItem.fabrics.length === 1 ? '' : 's'} on this garment`
                      : 'Left to Production or the Inventory Officer'}
                  </span>
                </div>
                {/* Measurements used to sit here, once per garment. They are
                    one set for the whole order now, above the garment list. */}
                <label className="os-field os-field-full">
                  <span>Design Notes</span>
                  <textarea value={orderItem.designNotes} onChange={(event) => updateItem(index, { designNotes: event.target.value })} placeholder="Internal notes for the Production team — style, finishing, special instructions…" rows={3} />
                </label>
                <div className="os-field os-field-full">
                  {/* These were free-text boxes for a filename, so Production
                      and the Tailor received the name of a photo they could
                      not see. They take the photo itself. */}
                  <span className="os-field-label">Style Images <em>(up to 5 — the Tailor sees these on the job sheet)</em></span>
                  <div className="os-image-grid">
                    {orderItem.styleImages.map((image, imageIndex) => (
                      <label key={`style-image-${index}-${imageIndex}`} className={`os-image-slot ${image?.dataUrl ? 'os-image-slot-filled' : ''}`}>
                        {image?.dataUrl ? (
                          <>
                            <img src={image.dataUrl} alt={`Style reference ${imageIndex + 1}`} />
                            <button
                              type="button"
                              className="os-image-remove"
                              aria-label={`Remove image ${imageIndex + 1}`}
                              onClick={(event) => { event.preventDefault(); updateStyleImage(index, imageIndex, null); }}
                            >×</button>
                          </>
                        ) : (
                          <>
                            <Plus size={16} strokeWidth={1.5} />
                            <span>Image {imageIndex + 1}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => readStyleImage(index, imageIndex, event.target.files?.[0])}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {message ? (
            <div className={`os-message ${message.startsWith('Order sheet saved') ? 'os-msg-success' : 'os-msg-error'}`}>
              {message.startsWith('Order sheet saved') ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
              <span>{message}</span>
            </div>
          ) : null}

          <button className="os-add-item-btn" type="button" onClick={addItem}>
            <Plus size={16} strokeWidth={2} />
            Add more items
          </button>

          <button className="os-release-btn" type="submit">
            <CheckCircle size={17} strokeWidth={2} />
            Release Order Sheet to Production
          </button>
        </form>

        <aside className="os-sidebar">
          <div className="os-summary-card">
            <header>
              <ClipboardList size={14} strokeWidth={1.5} />
              <h3>Order Summary</h3>
            </header>
            <dl>
              <dt>Invoice</dt>
              <dd>{sheetForm.invoiceNumber || <span className="os-empty">Not linked</span>}</dd>
              <dt>Customer</dt>
              <dd>{sheetForm.customer || <span className="os-empty">—</span>}</dd>
              <dt>Store</dt>
              <dd>{sheetForm.store}</dd>
              <dt>Items</dt>
              <dd>{sheetForm.items.length}</dd>
              <dt>Total pieces</dt>
              <dd>{sheetForm.items.reduce((sum, item) => sum + (toNumber(item.pieces) || 1), 0)}</dd>
            </dl>
            <ol className="os-summary-items">
              {sheetForm.items.map((item, index) => (
                <li key={item.key}>
                  <strong>{item.item || <span className="os-empty">Item {index + 1} not named</span>}</strong>
                  <small>{(toNumber(item.pieces) || 1)} pc · {item.fabric || 'fabric not selected'} · {item.delivery || 'no date'}</small>
                </li>
              ))}
            </ol>
          </div>
          <div className="os-sidebar-note">
            <AlertTriangle size={13} strokeWidth={1.5} />
            <p>The order sheet will become visible to Production after Accounts approves the invoice.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Assignment and scoring for one order, item by item. Reads and writes through
// the two endpoints that enforce the rules — at most four tailors on an item,
// and nothing scored before the work is marked ready — so the screen cannot
// promise something the server will refuse.
function TailorAssignmentPanel({ job, tailors, onSaved, onNotify }) {
  const items = (job.items || []).length ? job.items : [{ item: job.item || 'Order', tailors: job.tailor && job.tailor !== 'Unassigned' ? [job.tailor] : [] }];
  const [saving, setSaving] = useState(false);
  const ready = ['Ready', 'Ready for Collection'].includes(job.status);

  const write = async (path, body, successMessage) => {
    setSaving(true);
    try {
      const response = await api.patch(`/oms/jobs/${job.invoiceNumber}/${path}`, body);
      const sheet = response.data?.data?.orderSheet;
      if (sheet) onSaved?.(sheet);
      onNotify?.(successMessage, 'success');
    } catch (error) {
      onNotify?.(error.response?.data?.message || 'That could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleTailor = (index, name) => {
    const current = items[index].tailors || [];
    const next = current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name];
    if (next.length > 4) {
      onNotify?.('An item can be shared between at most 4 tailors.', 'error');
      return;
    }
    write('assignments', { items: [{ index, tailors: next }] },
      next.length ? `${items[index].item || 'Item'} assigned to ${next.join(', ')}` : 'Assignment removed');
  };

  const score = (index, name, value) => {
    write('scores', { scores: [{ itemIndex: index, tailor: name, score: Number(value) }] },
      `${name} scored ${value} out of 10`);
  };

  return (
    <div className="tailor-assign">
      {items.map((item, index) => (
        <div className="tailor-assign-item" key={item.key || index}>
          <header>
            <strong>{item.item || `Item ${index + 1}`}</strong>
            <span>{(item.tailors || []).length ? `${item.tailors.length} of 4 assigned` : 'Nobody assigned yet'}</span>
          </header>
          <div className="tailor-assign-picks">
            {tailors.map((person) => {
              const chosen = (item.tailors || []).includes(person.displayName);
              return (
                <button
                  type="button"
                  key={person.id}
                  className={chosen ? 'is-chosen' : ''}
                  disabled={saving}
                  onClick={() => toggleTailor(index, person.displayName)}
                >{person.displayName}</button>
              );
            })}
            {tailors.length ? null : <span className="tailor-assign-empty">No tailors on the staff list yet.</span>}
          </div>

          {/* Scoring only makes sense once there is finished work to judge. It
              said nothing about that, so a production manager looking for it on
              a job still being worked found no explanation. */}
          {!ready && (item.tailors || []).length ? (
            <p className="tailor-assign-note">
              Scoring opens when this is marked ready — it is {String(job.status || 'not started').toLowerCase()}.
            </p>
          ) : null}
          {ready && (item.tailors || []).length ? (
            <div className="tailor-assign-scores">
              {(item.tailors || []).map((name) => (
                <label key={name}>
                  <span>{name}</span>
                  <select
                    value={item.scores?.[name]?.score ?? ''}
                    disabled={saving}
                    onChange={(event) => score(index, name, event.target.value)}
                  >
                    <option value="" disabled>Score…</option>
                    {Array.from({ length: 11 }, (_, mark) => <option key={mark} value={mark}>{mark} / 10</option>)}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ProductionView({ productionJobs, blockedJobs = [], onUpdateJob, currentRole, onOverrideHold }) {
  const canOverrideHold = ['owner', 'admin'].includes(currentRole?.id);
  const [statusFilter, setStatusFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [jobModal, setJobModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [allocatingJobId, setAllocatingJobId] = useState(null);
  const [confirmReady, setConfirmReady] = useState(null);
  const toastTimerRef = useRef(null);
  const filteredJobs = productionJobs.filter((job) => (
    (statusFilter === 'All' ? true : job.status === statusFilter)
    && `${job.customer} ${job.invoiceNumber} ${job.item}`.toLowerCase().includes(query.toLowerCase())
  ));
  const productionTabs = ['All', 'Order Sheet Confirmed', 'Assigned', 'In Progress', 'Ready'];
  const readyToAssign = productionJobs.filter((job) => job.status === 'Order Sheet Confirmed').length;
  const inProgress = productionJobs.filter((job) => ['Assigned', 'In Progress'].includes(job.status)).length;
  const readyForCollection = productionJobs.filter((job) => job.status === 'Ready').length;
  // Held jobs, grouped by what is holding them. A job that cannot be worked is
  // now kept out of the queue rather than counted on a card while sitting in
  // it, so this is the one place to look for what is stuck.
  const blockedByReason = blockedJobs.reduce((groups, entry) => {
    groups[entry.reason] = [...(groups[entry.reason] || []), entry.job];
    return groups;
  }, {});

  const exceptionCards = [
    ...Object.entries(blockedByReason).map(([reason, jobs]) => [
      reason === 'Invoice unpaid' ? '₦' : reason === 'Measurements missing' ? '✂' : '⏳',
      reason,
      jobs.length,
      reason === 'Awaiting Accounts approval' ? 'With Accounts' : 'Cannot start',
      reason === 'Awaiting Accounts approval' ? 'Waiting' : 'Blocked',
    ]),
    // Fabric is a warning rather than a block: the job can be assigned and the
    // cloth confirmed before cutting.
    ['⚠', 'Fabric not confirmed', productionJobs.filter((job) => job.fabric && !job.fabricConfirmed && job.fabric !== 'Client supplied').length, 'Stock to confirm', 'Warning'],
    ['◇', 'Awaiting client fabric', productionJobs.filter((job) => job.fabric === 'Client supplied' && !job.fabricConfirmed).length, 'Not yet received', 'Warning'],
  ].filter((card) => card[2] > 0);
  const exceptionTotal = exceptionCards.reduce((total, card) => total + card[2], 0);

  useEffect(() => {
    api.get('/oms/fabrics')
      .then((response) => setInventory(response.data?.data?.fabrics || []))
      .catch(() => notify('Unable to load current inventory'));
    api.get('/oms/staff')
      .then((response) => setTailors((response.data?.data?.staffUsers || []).filter((person) => person.role === 'tailor')))
      .catch(() => notify('Unable to load tailors'));
  }, []);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  const updateJobWithToast = (job, changes, message) => {
    onUpdateJob(job.id, changes);
    notify(message);
  };

  // Everything this garment needs, from the list the order sheet carries. An
  // older order that named a single fabric arrives here as a list of one.
  const fabricLinesFor = (order) => {
    const chosen = (order.items || []).flatMap((item) => item.fabrics || []);
    const lines = chosen.length ? chosen : (order.fabrics || []);
    if (lines.length) {
      return lines
        .filter((line) => line.fabricId && Number(line.quantity) > 0)
        .map((line) => ({ fabricId: line.fabricId, quantity: Number(line.quantity), name: line.name, unit: line.unit }));
    }
    const single = inventory.find((fabric) => fabric.id === order.fabricId)
      || inventory.find((fabric) => fabric.name === order.fabric);
    const usage = Number(order.fabricUsage);
    return single && Number.isFinite(usage) && usage > 0
      ? [{ fabricId: single.id, quantity: usage, name: single.name, unit: single.unit }]
      : [];
  };

  const allocateFabric = async (order) => {
    if (order.fabric === 'Client supplied') {
      updateJobWithToast(order, { fabricConfirmed: true, fabricAllocated: true }, 'Client-supplied fabric confirmed');
      return;
    }
    const lines = fabricLinesFor(order);
    if (!lines.length) {
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
        fabrics: lines.map((line) => ({ fabricId: line.fabricId, quantity: line.quantity })),
        trackingToken: order.trackingToken,
        tailorName: order.tailor,
      });
      const allocated = response.data?.data?.allocated || [];
      // Stock moved for each of them, so the list on screen is read again
      // rather than patched one item at a time.
      api.get('/oms/fabrics')
        .then((fresh) => setInventory(fresh.data?.data?.fabrics || []))
        .catch(() => {});
      onUpdateJob(order.id, {
        fabricConfirmed: true,
        fabricAllocated: true,
        fabricAllocations: allocated,
      });
      notify(`${allocated.map((line) => `${line.quantity} ${line.unit} of ${line.name}`).join(', ')} allocated to ${order.invoiceNumber}`);
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to allocate fabric');
    } finally {
      setAllocatingJobId(null);
    }
  };

  // The fabrics on the job being looked at. An order sheet raised with fabrics
  // arrives with them; an older one that named a single fabric is read as a
  // list of one, so nothing is lost.
  const jobFabrics = (() => {
    if (!jobModal) return [];
    const fromItems = (jobModal.items || []).flatMap((item) => item.fabrics || []);
    const listed = fromItems.length ? fromItems : (jobModal.fabrics || []);
    if (listed.length) return listed;
    if (jobModal.fabric === 'Client supplied') {
      return [{ fabricId: '', name: 'Client supplied', unit: '', quantity: '', clientSupplied: true }];
    }
    return jobModal.fabricId
      ? [{ fabricId: jobModal.fabricId, name: jobModal.fabric, unit: jobModal.fabricUnit, quantity: jobModal.fabricUsage || '' }]
      : [];
  })();

  // Written back to the sheet's own list, and mirrored onto the single fields
  // the board and the tracking page still read.
  const saveJobFabrics = (fabrics) => {
    const [first] = fabrics;
    const changes = {
      fabrics,
      fabric: first?.clientSupplied ? 'Client supplied' : first?.name || '',
      fabricId: first?.fabricId || '',
      fabricUnit: first?.unit || '',
      fabricUsage: first?.quantity || '',
      fabricConfirmed: false,
    };
    setJobModal((current) => ({ ...current, ...changes }));
    onUpdateJob(jobModal.id, changes);
  };

  const addJobFabric = (fabricId) => {
    if (!fabricId || jobFabrics.some((entry) => entry.fabricId === fabricId)) return;
    const chosen = fabricId === 'client-supplied'
      ? { fabricId: '', name: 'Client supplied', unit: '', quantity: '', clientSupplied: true }
      : (() => {
        const item = inventory.find((fabric) => fabric.id === fabricId);
        return item ? { fabricId: item.id, name: item.name, unit: item.unit, quantity: '' } : null;
      })();
    if (chosen) saveJobFabrics([...jobFabrics, chosen]);
  };

  const setJobFabricQuantity = (fabricId, quantity) => saveJobFabrics(
    jobFabrics.map((entry) => (entry.fabricId === fabricId ? { ...entry, quantity } : entry))
  );

  const removeJobFabric = (fabricId) => saveJobFabrics(
    jobFabrics.filter((entry) => entry.fabricId !== fabricId)
  );

  const allocateFabricForModal = async () => {
    if (!jobModal) return;
    if (jobModal.fabric === 'Client supplied') {
      const updatedJob = { ...jobModal, fabricConfirmed: true, fabricAllocated: true };
      setJobModal(updatedJob);
      onUpdateJob(jobModal.id, { fabricConfirmed: true, fabricAllocated: true });
      notify('Client-supplied fabric confirmed', 'success');
      return;
    }
    // Every fabric on the job, not just the first.
    const lines = jobFabrics
      .filter((entry) => entry.fabricId && Number(entry.quantity) > 0)
      .map((entry) => ({ fabricId: entry.fabricId, quantity: Number(entry.quantity), name: entry.name, unit: entry.unit }));
    if (!lines.length) { notify('Add a fabric and say how much of it this job needs', 'error'); return; }
    if (!jobModal.tailor || jobModal.tailor === 'Unassigned') { notify('Assign a tailor before allocating fabric', 'error'); return; }
    if (!jobModal.trackingToken) { notify('This job has no saved order sheet', 'error'); return; }
    setAllocatingJobId(jobModal.id);
    try {
      const response = await api.post('/oms/fabrics/allocate', {
        fabrics: lines.map((line) => ({ fabricId: line.fabricId, quantity: line.quantity })),
        trackingToken: jobModal.trackingToken,
        tailorName: jobModal.tailor,
      });
      const allocated = response.data?.data?.allocated || [];
      api.get('/oms/fabrics').then((fresh) => setInventory(fresh.data?.data?.fabrics || [])).catch(() => {});
      const changes = { fabricConfirmed: true, fabricAllocated: true, fabricAllocations: allocated };
      setJobModal((current) => ({ ...current, ...changes }));
      onUpdateJob(jobModal.id, changes);
      notify(`${allocated.map((line) => `${line.quantity} ${line.unit} of ${line.name}`).join(', ')} allocated to ${jobModal.invoiceNumber}`, 'success');
    } catch (error) {
      notify(error.response?.data?.message || 'Unable to allocate fabric', 'error');
    } finally {
      setAllocatingJobId(null);
    }
  };

  return (
    <div className="os-page">
      {/* Toast */}
      {toast ? (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 10, background: toast.type === 'success' ? '#f0faf4' : toast.type === 'error' ? '#fff5f0' : '#fffbf0', border: '1px solid', borderColor: toast.type === 'success' ? '#c3e8d4' : toast.type === 'error' ? '#f3d5cc' : '#e8d9a0', color: toast.type === 'success' ? '#2a7d4f' : toast.type === 'error' ? '#8a3520' : '#7a6030', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      ) : null}

      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Factory size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Production Board</h2>
            <p>Manage job assignments, fabric allocation and production progress</p>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="os-kpi-row" style={{ gap: 12 }}>
        {[
          { icon: <ClipboardList size={18} strokeWidth={1.5} />, label: 'Ready to Assign', value: readyToAssign, detail: 'Awaiting tailor', color: '#c97b08', bg: '#fffbf0' },
          { icon: <Scissors size={18} strokeWidth={1.5} />, label: 'In Progress', value: inProgress, detail: 'Currently with tailors', color: '#4a6fa5', bg: '#f0f4ff' },
          { icon: <CheckCircle size={18} strokeWidth={1.5} />, label: 'Ready for Collection', value: readyForCollection, detail: 'Awaiting store pickup', color: '#2a7d4f', bg: '#f0faf4' },
          { icon: <AlertCircle size={18} strokeWidth={1.5} />, label: 'Exceptions', value: exceptionTotal, detail: 'Need attention', color: '#8a3520', bg: '#fff5f0' },
        ].map(({ icon, label, value, detail, color, bg }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #eee5da', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1611', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e42', marginTop: 2 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#8a7a6a' }}>{detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Columns come from .os-layout so the sidebar can stack on a phone; an
          inline grid-template-columns here left the job list 86px wide. */}
      <div className="os-layout">
        {/* Main: Active Jobs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Held jobs. The Exceptions figure used to be a count with nothing
              behind it — no list, nothing to click. These are the orders that
              cannot be worked, each saying what is holding it. */}
          {blockedJobs.length ? (
            <div className="os-card" style={{ borderColor: '#f0c8b8' }}>
              <div className="os-card-head" style={{ background: '#fff7f3' }}>
                <AlertCircle size={16} strokeWidth={1.5} style={{ color: '#8a3520' }} />
                <div>
                  <strong>Held — cannot start</strong>
                  <p>{blockedJobs.length} order{blockedJobs.length === 1 ? '' : 's'} waiting on something before production can begin</p>
                </div>
              </div>
              <div className="os-card-body" style={{ gap: 8 }}>
                {blockedJobs.map(({ job, reason }) => (
                  <div
                    key={job.id || job.invoiceNumber}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                      padding: '10px 12px', border: '1px solid #f3ede5', borderRadius: 9, background: '#fffdfb',
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#5a4e42' }}>{job.invoiceNumber}</span>
                    <strong style={{ fontSize: 13, color: '#1a1611', flex: '1 1 10rem' }}>{job.customer}</strong>
                    <span style={{ fontSize: 12, color: '#8a7a6a' }}>{job.item || 'Order'}</span>
                    <span style={{
                      fontSize: 11.5, fontWeight: 700, color: '#8a3520', background: '#fff5f0',
                      border: '1px solid #f0c8b8', borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
                    }}>{reason}</span>
                    {/* Releasing a held order is the Owner's and Admin's call.
                        Accounts approve the invoice; that is a separate thing. */}
                    {canOverrideHold && !/measurements/i.test(reason) ? (
                      <button
                        type="button"
                        onClick={() => onOverrideHold?.(job, reason)}
                        style={{
                          border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#1a1611',
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >Send to production anyway</button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="os-card">
            <div className="os-card-head">
              <ClipboardList size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
              <div><strong>Active Jobs</strong><p>All production orders currently in the system</p></div>
            </div>
            <div style={{ padding: '14px 18px 0', borderBottom: '1px solid #eee5da' }}>
              {/* Search */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#b0a090', pointerEvents: 'none' }} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by customer, invoice or item…"
                    style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#1a1611' }}
                  />
                </div>
              </div>
              {/* Status tabs */}
              <nav style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 0 }}>
                {productionTabs.map((tab) => {
                  const count = tab === 'All' ? productionJobs.length : productionJobs.filter((job) => job.status === tab).length;
                  const label = tab === 'Order Sheet Confirmed' ? 'Ready to Assign' : tab === 'Ready' ? 'Ready for Collection' : tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid', borderColor: statusFilter === tab ? '#1a1611' : '#ddd5c8', background: statusFilter === tab ? '#1a1611' : '#fff', color: statusFilter === tab ? '#fff' : '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                    >
                      {label}
                      <span style={{ background: statusFilter === tab ? 'rgba(255,255,255,0.2)' : '#eee5da', color: statusFilter === tab ? '#fff' : '#8a7a6a', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Job Table — Desktop */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', display: 'table' }}>
                <thead>
                  <tr>
                    {['Customer', 'Item', 'Delivery', 'Tailor', 'Fabric', 'Status', ''].map((h) => (
                      <th key={h} style={{ padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length ? filteredJobs.map((order, idx) => (
                    <tr key={order.id} style={{ borderBottom: idx < filteredJobs.length - 1 ? '1px solid #f3ede5' : 'none', background: 'white' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                      <td data-label="Customer" style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1611', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {order.customer.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{order.customer}</div>
                            <div style={{ fontSize: 11, color: '#8a7a6a' }}>{order.invoiceNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Item" style={{ padding: '12px 14px', fontSize: 13, color: '#1a1611' }}>
                        <div style={{ fontWeight: 600 }}>{order.item}</div>
                        <div style={{ fontSize: 11, color: '#8a7a6a' }}>{order.pieces} {order.pieces === 1 ? 'piece' : 'pieces'}</div>
                      </td>
                      <td data-label="Delivery" style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={12} style={{ color: '#b0a090' }} />
                          {order.delivery ? new Date(`${order.delivery}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date'}
                        </div>
                      </td>
                      <td data-label="Tailor" style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: (!order.tailor || order.tailor === 'Unassigned') ? '#fffbf0' : '#f0faf4', color: (!order.tailor || order.tailor === 'Unassigned') ? '#7a6030' : '#2a7d4f', border: '1px solid', borderColor: (!order.tailor || order.tailor === 'Unassigned') ? '#e8d9a0' : '#c3e8d4' }}>
                          {order.tailor || 'Unassigned'}
                        </span>
                      </td>
                      <td data-label="Fabric" style={{ padding: '12px 14px', fontSize: 12, color: order.fabricConfirmed ? '#2a7d4f' : '#7a6030' }}>
                        <div style={{ fontWeight: 600 }}>{order.fabric || 'Not selected'}</div>
                        <div style={{ fontSize: 11 }}>{order.fabricConfirmed ? 'Confirmed' : 'Pending'}</div>
                      </td>
                      <td data-label="Status" style={{ padding: '12px 14px' }}>
                        <Status>{order.status === 'Order Sheet Confirmed' ? 'Ready to Assign' : order.status === 'Ready' ? 'Ready for Collection' : order.status}</Status>
                      </td>
                      <td data-label="Actions" style={{ padding: '12px 14px' }}>
                        <button
                          type="button"
                          onClick={() => setJobModal(order)}
                          style={{ padding: '5px 12px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>
                        No approved job sheets visible yet. Accounts must approve the invoice before Production can see the order sheet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile job cards */}
            <div style={{ display: 'none', flexDirection: 'column', gap: 10, padding: '14px 14px' }} className="prod-mobile-cards">
              {filteredJobs.map((order) => (
                <div key={order.id} style={{ border: '1px solid #eee5da', borderRadius: 10, padding: '14px', background: '#fff', borderLeft: '3px solid #c97b08' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{order.customer}</div>
                      <div style={{ fontSize: 12, color: '#8a7a6a' }}>{order.invoiceNumber} · {order.item}</div>
                    </div>
                    <Status>{order.status === 'Order Sheet Confirmed' ? 'Ready to Assign' : order.status === 'Ready' ? 'Ready for Collection' : order.status}</Status>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#5a4e42' }}>Tailor: <strong>{order.tailor || 'Unassigned'}</strong></span>
                    <span style={{ fontSize: 12, color: '#5a4e42' }}>Fabric: <strong>{order.fabric || '—'}</strong></span>
                  </div>
                  <button type="button" onClick={() => setJobModal(order)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#faf7f3', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    View Job Details
                  </button>
                </div>
              ))}
            </div>

            {filteredJobs.length > 0 && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid #eee5da', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#8a7a6a' }}>Showing {filteredJobs.length} of {productionJobs.length} jobs</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="os-sidebar">
          {/* Tailor availability */}
          <div className="os-card">
            <div className="os-card-head" style={{ padding: '12px 16px' }}>
              <Users size={14} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
              <div><strong style={{ fontSize: 13 }}>Tailor Availability</strong></div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(tailors.length ? tailors : [
                { id: 'p1', displayName: 'Peter Okon', tailorGrade: 'Senior', tailorDepartment: 'Bespoke' },
                { id: 'p2', displayName: 'Segun Adeyemi', tailorGrade: 'Intermediate', tailorDepartment: 'Native' },
                { id: 'p3', displayName: 'Musa Ibrahim', tailorGrade: 'Senior', tailorDepartment: 'Suits' },
                { id: 'p4', displayName: 'Daniel Chinedu', tailorGrade: 'Junior', tailorDepartment: 'General' },
              ]).slice(0, 4).map((tailor) => {
                const load = productionJobs.filter((job) => job.tailor === tailor.displayName && job.status !== 'Ready').length;
                const pct = Math.min(load * 20, 100);
                return (
                  <div key={tailor.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a1611', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {tailor.displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1611', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tailor.displayName}</div>
                      <div style={{ fontSize: 10, color: '#8a7a6a' }}>{tailor.tailorDepartment || 'General'}</div>
                      <div style={{ height: 4, background: '#eee5da', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#8a3520' : pct >= 60 ? '#c97b08' : '#2a7d4f', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#5a4e42', flexShrink: 0 }}>{load}/5</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inventory Alerts */}
          <div className="os-card">
            <div className="os-card-head" style={{ padding: '12px 16px' }}>
              <AlertCircle size={14} strokeWidth={1.5} style={{ color: '#8a3520', flexShrink: 0 }} />
              <div><strong style={{ fontSize: 13 }}>Inventory Alerts</strong></div>
            </div>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(inventory.filter((fabric) => toNumber(fabric.quantity) <= toNumber(fabric.lowStockThreshold || 5)).slice(0, 3).length
                ? inventory.filter((fabric) => toNumber(fabric.quantity) <= toNumber(fabric.lowStockThreshold || 5)).slice(0, 3)
                : [{ id: 'f1', name: 'Black Jacquard Wool', quantity: 1.5, unit: 'm' }, { id: 'f2', name: 'Shiffon (Green)', quantity: 3.2, unit: 'm' }]
              ).map((fabric) => (
                <div key={fabric.id} style={{ padding: '8px 10px', borderRadius: 8, background: '#fff5f0', border: '1px solid #f3d5cc', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8a3520' }}>{fabric.name}</div>
                  <div style={{ fontSize: 11, color: '#5a4e42' }}>Low stock: {fabric.quantity}{fabric.unit} remaining</div>
                </div>
              ))}
              {!inventory.filter((fabric) => toNumber(fabric.quantity) <= toNumber(fabric.lowStockThreshold || 5)).length && (
                <div style={{ fontSize: 12, color: '#2a7d4f', padding: '8px 0' }}>All inventory levels are healthy.</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="os-card">
            <div className="os-card-head" style={{ padding: '12px 16px' }}>
              <Clock size={14} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
              <div><strong style={{ fontSize: 13 }}>Recent Activity</strong></div>
            </div>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...productionJobs].slice(0, 4).map((job) => (
                <div key={job.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c97b08', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: '#5a4e42', flex: 1 }}>
                    <strong style={{ color: '#1a1611' }}>{job.customer}</strong> {job.status === 'Ready' ? 'marked as ready' : job.tailor && job.tailor !== 'Unassigned' ? `assigned to ${job.tailor}` : 'job sheet released'}
                  </div>
                </div>
              ))}
              {!productionJobs.length && <div style={{ fontSize: 12, color: '#8a7a6a' }}>No recent production activity.</div>}
            </div>
          </div>
        </aside>
      </div>

      {/* Job Detail Modal */}
      {jobModal && (
        <div className="receive-stock-backdrop" onClick={(e) => e.target === e.currentTarget && setJobModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,17,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}>
            {/* Modal Header */}
            <div style={{ background: '#1a1611', borderRadius: '16px 16px 0 0', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#c97b08', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                {jobModal.customer.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{jobModal.invoiceNumber}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{jobModal.customer}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{jobModal.item} · {jobModal.pieces} {jobModal.pieces === 1 ? 'piece' : 'pieces'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Status>{jobModal.status === 'Order Sheet Confirmed' ? 'Ready to Assign' : jobModal.status === 'Ready' ? 'Ready for Collection' : jobModal.status}</Status>
                <button type="button" onClick={() => setJobModal(null)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>

            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Style Images', `${jobModal.images || 0} references`],
                  ['Measurements', jobModal.measurements ? 'Included' : 'Not added'],
                  ['Store', jobModal.store || '—'],
                  ['Fabric Status', `${jobModal.fabric || 'Not selected'} · ${jobModal.fabricConfirmed ? 'Confirmed' : 'Pending'}`],
                  ['Delivery Date', jobModal.delivery ? new Date(`${jobModal.delivery}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: '10px 12px', background: '#faf7f3', borderRadius: 8, border: '1px solid #eee5da' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a7a6a', fontWeight: 700, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* An invoice can cover several garments; list them all so nothing
                  beyond the first item is missed on the floor. */}
              {jobModal.items?.length > 1 ? (
                <div className="job-item-list">
                  <div className="job-item-list-label">{jobModal.items.length} items on this order</div>
                  {jobModal.items.map((line, index) => (
                    <div key={`${line.item}-${index}`} className="job-item-row">
                      <span className="job-item-index">{index + 1}</span>
                      <div>
                        <strong>{line.item || 'Unnamed item'}</strong>
                        <small>
                          {toNumber(line.pieces) || 1} {(toNumber(line.pieces) || 1) === 1 ? 'piece' : 'pieces'}
                          {line.fabric ? ` · ${line.fabric}` : ''}
                          {line.delivery ? ` · due ${new Date(`${line.delivery}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                        </small>
                        {line.designNotes ? <small className="job-item-note">{line.designNotes}</small> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Production note display */}
              {(jobModal.designNotes || jobModal.productionNote || jobModal.note) ? (
                <div style={{ padding: '12px 14px', background: '#fffbf0', border: '1px solid #e8d9a0', borderRadius: 8, fontSize: 13, color: '#5a4e42' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a7a6a', fontWeight: 700, marginBottom: 4 }}>Production Note</div>
                  {jobModal.productionNote || jobModal.designNotes || jobModal.note}
                </div>
              ) : null}

              {/* Who is making what. A suit's jacket and trousers are rarely
                  the same pair of hands, so each item carries its own tailors —
                  as many as four — and each of them is scored on the finished
                  work once the order is ready. */}
              <TailorAssignmentPanel
                job={jobModal}
                tailors={tailors}
                onSaved={(sheet) => {
                  setJobModal((current) => ({ ...current, ...sheet }));
                  onUpdateJob(jobModal.id, sheet);
                }}
                onNotify={notify}
              />

              {/* Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* One garment usually needs several — a shell, a lining, a
                    zip — and this offered one. Production adds as many as the
                    order needs, each with how much of it, and allocation takes
                    the whole list. */}
                <div className="os-field fabric-picker" style={{ gridColumn: '1 / -1' }}>
                  <span>Fabric</span>
                  {jobFabrics.length ? (
                    <ul className="fabric-chosen">
                      {jobFabrics.map((entry) => {
                        const stock = inventory.find((fabric) => fabric.id === entry.fabricId);
                        const available = toNumber(stock?.quantity);
                        const short = Boolean(entry.fabricId) && toNumber(entry.quantity) > available;
                        return (
                          <li key={entry.fabricId || 'client-supplied'}>
                            <div>
                              <strong>{entry.name}</strong>
                              <small>{entry.clientSupplied ? 'The customer is bringing this' : `${available} ${stock?.unit || entry.unit} in stock`}</small>
                            </div>
                            {entry.clientSupplied ? <span className="fabric-supplied">Customer&apos;s own</span> : (
                              <label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={entry.quantity ?? ''}
                                  disabled={jobModal.fabricAllocated}
                                  onChange={(event) => setJobFabricQuantity(entry.fabricId, event.target.value)}
                                  aria-label={`How much ${entry.name} this job needs`}
                                />
                                <span>{entry.unit || 'units'}</span>
                              </label>
                            )}
                            <button
                              type="button"
                              disabled={jobModal.fabricAllocated}
                              onClick={() => removeJobFabric(entry.fabricId)}
                              aria-label={`Remove ${entry.name}`}
                            >×</button>
                            {short ? <p>Only {available} {stock?.unit} left.</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <select
                    value=""
                    disabled={jobModal.fabricAllocated}
                    onChange={(event) => { addJobFabric(event.target.value); event.target.value = ''; }}
                  >
                    <option value="">{jobFabrics.length ? 'Add another fabric…' : 'Select inventory fabric'}</option>
                    <option value="client-supplied">Client supplied</option>
                    {inventory
                      .filter((fabric) => !jobFabrics.some((entry) => entry.fabricId === fabric.id))
                      .map((f) => <option key={f.id} value={f.id} disabled={toNumber(f.quantity) <= 0}>{f.name} ({toNumber(f.quantity)} {f.unit}){toNumber(f.quantity) <= 0 ? ' · Out of stock' : ''}</option>)}
                  </select>
                  {jobModal.fabricAllocated ? <span className="os-fabric-hint">Already allocated — stock has been taken for this job.</span> : null}
                </div>
                {/* The customer's delivery date is the shop's business. A
                    tailor works to a date Production sets, which is normally
                    earlier — it leaves room for checking and finishing. */}
                <label className="os-field">
                  <span>Tailor&apos;s due date</span>
                  <input
                    type="date"
                    value={jobModal.tailorDueDate || ''}
                    max={jobModal.delivery || undefined}
                    onChange={(e) => {
                      setJobModal((j) => ({ ...j, tailorDueDate: e.target.value }));
                      onUpdateJob(jobModal.id, { tailorDueDate: e.target.value });
                    }}
                  />
                  <span className="os-fabric-hint">
                    {jobModal.delivery
                      ? `Customer's delivery date is ${new Date(`${jobModal.delivery}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, which the tailor does not see.`
                      : 'The tailor does not see the customer\'s delivery date.'}
                  </span>
                </label>
                {/* Quantity now sits against each fabric above. */}
                <label className="os-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Production note</span>
                  <textarea value={jobModal.productionNote || ''} onChange={(e) => { setJobModal((j) => ({ ...j, productionNote: e.target.value })); onUpdateJob(jobModal.id, { productionNote: e.target.value }); }} placeholder="Instructions for tailor..." rows={2} />
                </label>
              </div>

              {/* The scope calls for a comment thread on the job sheet, so a
                  question about a garment stays with the garment rather than in
                  somebody's phone. */}
              <JobCommentThread
                invoiceNumber={jobModal.invoiceNumber}
                currentRole={currentRole}
                role="production_manager"
                compact
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {/* Once fabric is allocated the button had nothing left to do
                    and simply restated the Fabric Status panel above, so it
                    stands down rather than sitting there as a dead control. */}
                {!jobModal.fabricAllocated ? (
                  <button
                    type="button"
                    disabled={allocatingJobId === jobModal.id}
                    onClick={() => allocateFabricForModal()}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {allocatingJobId === jobModal.id ? 'Allocating…' : <><Package size={14} /> Allocate Fabric</>}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={jobModal.status === 'In Progress' || jobModal.status === 'Ready'}
                  onClick={() => {
                    const updatedJob = { ...jobModal, status: 'In Progress' };
                    setJobModal(updatedJob);
                    onUpdateJob(jobModal.id, { status: 'In Progress' });
                    notify('Job set to In Progress', 'success');
                  }}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid', borderColor: (jobModal.status === 'In Progress' || jobModal.status === 'Ready') ? '#c3e8d4' : '#ddd5c8', borderRadius: 8, background: (jobModal.status === 'In Progress' || jobModal.status === 'Ready') ? '#f0faf4' : '#fff', color: (jobModal.status === 'In Progress' || jobModal.status === 'Ready') ? '#2a7d4f' : '#5a4e42', fontSize: 13, fontWeight: 700, cursor: (jobModal.status === 'In Progress' || jobModal.status === 'Ready') ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {(jobModal.status === 'In Progress' || jobModal.status === 'Ready') ? <><CheckCircle size={14} /> In Progress</> : 'Set In Progress'}
                </button>
                {/* Marking a job Ready notifies the store that the customer can
                    collect, so it asks first rather than firing on one tap. */}
                <button
                  type="button"
                  disabled={jobModal.status === 'Ready'}
                  onClick={() => setConfirmReady(jobModal)}
                  style={{ flex: 1, padding: '10px 14px', border: 'none', borderRadius: 8, background: jobModal.status === 'Ready' ? '#f0faf4' : '#1a1611', color: jobModal.status === 'Ready' ? '#2a7d4f' : '#fff', fontSize: 13, fontWeight: 700, cursor: jobModal.status === 'Ready' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {jobModal.status === 'Ready' ? <><CheckCircle size={14} /> Ready for Collection</> : 'Mark as Ready'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmReady ? (
        <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-ready-title">
          <div className="confirm-sheet">
            <i className="confirm-sheet-icon"><CheckCircle size={22} strokeWidth={1.8} /></i>
            <h2 id="confirm-ready-title">Mark this job as ready?</h2>
            <p>
              {confirmReady.customer}&apos;s {confirmReady.item || 'order'} ({confirmReady.invoiceNumber}) will be
              marked ready for collection, and the store will be notified to contact the customer.
            </p>
            <footer>
              <button type="button" className="confirm-cancel" onClick={() => setConfirmReady(null)}>No, go back</button>
              <button
                type="button"
                className="confirm-submit"
                onClick={() => {
                  const job = confirmReady;
                  setJobModal((current) => (current && current.id === job.id ? { ...current, status: 'Ready' } : current));
                  onUpdateJob(job.id, { status: 'Ready' });
                  notify('Job marked Ready for Collection', 'success');
                  setConfirmReady(null);
                }}
              >
                Yes, mark ready
              </button>
            </footer>
          </div>
        </div>
      ) : null}
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
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('');

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

  const totalFabrics = inventory.length;
  const lowStock = inventory.filter((f) => { const q = toNumber(f.quantity); const t = toNumber(f.lowStockThreshold); return q > 0 && q <= t; }).length;
  const outOfStock = inventory.filter((f) => toNumber(f.quantity) <= 0).length;
  const inStock = inventory.filter((f) => { const q = toNumber(f.quantity); const t = toNumber(f.lowStockThreshold); return q > t; }).length;
  const filteredInv = inventory.filter((f) => {
    const matchSearch = !invSearch || f.name.toLowerCase().includes(invSearch.toLowerCase()) || (f.type || '').toLowerCase().includes(invSearch.toLowerCase());
    const matchCat = !invCategory || f.type === invCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Inventory</h2>
            <p>Fabric ledger, stock levels and allocation history</p>
          </div>
        </div>
        <button type="button" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> Add Fabric
        </button>
      </div>

      {/* KPI Row */}
      <div className="os-kpi-row" style={{ gap: 12 }}>
        {[
          { label: 'Total Fabrics', value: totalFabrics, color: '#c97b08', bg: '#fffbf0', icon: <Boxes size={17} strokeWidth={1.5} /> },
          { label: 'In Stock', value: inStock, color: '#2a7d4f', bg: '#f0faf4', icon: <CheckCircle size={17} strokeWidth={1.5} /> },
          { label: 'Low Stock', value: lowStock, color: '#7a6030', bg: '#fffbf0', icon: <AlertCircle size={17} strokeWidth={1.5} /> },
          { label: 'Out of Stock', value: outOfStock, color: '#8a3520', bg: '#fff5f0', icon: <AlertCircle size={17} strokeWidth={1.5} /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #eee5da', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1611', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e42', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Message banner */}
      {message ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? '#fff5f0' : '#f0faf4', border: '1px solid', borderColor: message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? '#f3d5cc' : '#c3e8d4', fontSize: 13, color: message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? '#8a3520' : '#2a7d4f' }} role="status">
          {message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          <span>{message}</span>
        </div>
      ) : null}

      {/* Add Fabric Form */}
      {formOpen ? (
        <div className="os-card">
          <div className="os-card-head">
            <span className="os-step-num">+</span>
            <div><strong>Add Inventory Item</strong><p>Create a new fabric or material stock record</p></div>
            <button type="button" onClick={closeForm} style={{ marginLeft: 'auto', padding: '5px 12px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
          <form onSubmit={saveInventory} className="os-card-body os-grid-2">
            <label className="os-field">
              <span>Item Name</span>
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="e.g. Black jacquard wool" required />
            </label>
            <label className="os-field">
              <span>Category / Type</span>
              <select value={form.type} onChange={(event) => updateForm('type', event.target.value)} required>
                <option value="">Select a category</option>
                {inventoryCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="os-field">
              <span>Quantity</span>
              <input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} required />
            </label>
            <label className="os-field">
              <span>Unit</span>
              <input value={form.unit} onChange={(event) => updateForm('unit', event.target.value)} placeholder="m, rolls, pieces" required />
            </label>
            <label className="os-field">
              <span>Supplier <em style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</em></span>
              <input value={form.supplier} onChange={(event) => updateForm('supplier', event.target.value)} placeholder="Supplier name" />
            </label>
            <label className="os-field">
              <span>Low-stock Threshold</span>
              <input type="number" min="0" step="0.01" value={form.lowStockThreshold} onChange={(event) => updateForm('lowStockThreshold', event.target.value)} required />
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="os-release-btn" type="submit" disabled={saving} style={{ maxWidth: 240 }}>
                <Plus size={16} strokeWidth={2} />
                {saving ? 'Saving…' : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Fabric Inventory Table */}
      <div className="os-card">
        <div className="os-card-head">
          <Boxes size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div><strong>Fabric Ledger</strong><p>All fabric and material stock records</p></div>
        </div>
        {/* Filter bar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee5da', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#b0a090', pointerEvents: 'none' }} />
            <input value={invSearch} onChange={(e) => setInvSearch(e.target.value)} placeholder="Search fabrics…" style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#1a1611' }} />
          </div>
          <select value={invCategory} onChange={(e) => setInvCategory(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: invCategory ? '#1a1611' : '#b0a090', background: '#fff', cursor: 'pointer' }}>
            <option value="">All Categories</option>
            {inventoryCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>Loading inventory…</div>
        ) : filteredInv.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fabric', 'Category', 'Stock', 'Unit', 'Threshold', 'Supplier', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInv.map((fabric, idx) => {
                  const quantity = toNumber(fabric.quantity);
                  const threshold = toNumber(fabric.lowStockThreshold);
                  const stockStatus = quantity <= 0 ? 'Out of Stock' : quantity <= threshold ? 'Low' : 'Healthy';
                  return (
                    <tr key={fabric.id} style={{ borderBottom: idx < filteredInv.length - 1 ? '1px solid #f3ede5' : 'none', background: 'white' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{fabric.name}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{fabric.type || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: quantity <= 0 ? '#8a3520' : quantity <= threshold ? '#7a6030' : '#1a1611' }}>{quantity.toLocaleString()}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{fabric.unit}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a' }}>{threshold.toLocaleString()} {fabric.unit}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{fabric.supplier || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <Status>{stockStatus}</Status>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>
            {inventory.length ? 'No fabrics match your search.' : 'No inventory items yet. Add your first stock record.'}
          </div>
        )}

        {/* Mobile cards */}
        {filteredInv.length > 0 && (
          <div style={{ display: 'none', flexDirection: 'column', gap: 10, padding: 14 }} className="inv-mobile-cards">
            {filteredInv.map((fabric) => {
              const quantity = toNumber(fabric.quantity);
              const threshold = toNumber(fabric.lowStockThreshold);
              const stockStatus = quantity <= 0 ? 'Out of Stock' : quantity <= threshold ? 'Low' : 'Healthy';
              return (
                <div key={fabric.id} style={{ border: '1px solid #eee5da', borderRadius: 10, padding: 14, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{fabric.name}</div>
                    <Status>{stockStatus}</Status>
                  </div>
                  <div style={{ fontSize: 12, color: '#5a4e42' }}>{fabric.type}{fabric.supplier ? ` · ${fabric.supplier}` : ''}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1611', marginTop: 6 }}>{quantity.toLocaleString()} {fabric.unit}</div>
                  <div style={{ fontSize: 11, color: '#8a7a6a' }}>Low-stock threshold: {threshold.toLocaleString()} {fabric.unit}</div>
                </div>
              );
            })}
          </div>
        )}

        {filteredInv.length > 0 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #eee5da', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#8a7a6a' }}>Showing {filteredInv.length} of {inventory.length} items</span>
            <div style={{ fontSize: 11, color: '#8a7a6a', padding: '5px 10px', background: '#faf7f3', borderRadius: 6, border: '1px solid #eee5da' }}>Read only · Stock changes through Production allocation</div>
          </div>
        )}
      </div>

      {/* Allocation Log */}
      <div className="os-card">
        <div className="os-card-head">
          <ClipboardList size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div><strong>Usage &amp; Allocation Log</strong><p>Audit trail of all fabric allocations to production jobs</p></div>
        </div>
        {allocations.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Fabric / Item', 'Quantity', 'Order', 'Customer', 'Tailor'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation, idx) => (
                  <tr key={allocation.id} style={{ borderBottom: idx < allocations.length - 1 ? '1px solid #f3ede5' : 'none', background: 'white' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', whiteSpace: 'nowrap' }}>{new Date(allocation.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{allocation.fabricName}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#1a1611' }}>{toNumber(allocation.quantity)} {allocation.unit}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: '#5a4e42' }}>{allocation.invoiceNumber}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{allocation.customerName}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{allocation.tailorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>Production allocations will appear here.</div>
        )}
      </div>
    </div>
  );
}

function StaffView({ role, currentRole }) {
  const stores = useStores();
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
      await api.delete(`/oms/staff/${person.id}`);
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

  const activeCount = staffUsers.filter((p) => p.status === 'active').length;
  const tailorCount = staffUsers.filter((p) => p.role === 'tailor').length;

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Users2 size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Tailors &amp; Staff</h2>
            <p>Manage staff accounts, roles, departments and tailor grades</p>
          </div>
        </div>
        {role === 'owner' ? (
          <button type="button" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> Add Staff
          </button>
        ) : null}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Staff', value: staffUsers.length, color: '#c97b08', bg: '#fffbf0' },
          { label: 'Active', value: activeCount, color: '#2a7d4f', bg: '#f0faf4' },
          { label: 'Tailors', value: tailorCount, color: '#4a6fa5', bg: '#f0f4ff' },
          { label: 'Other Roles', value: staffUsers.length - tailorCount, color: '#5a4e42', bg: '#faf7f3' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #eee5da', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flex: '1 1 140px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              <Users size={16} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1611', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#5a4e42', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Message */}
      {message ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? '#fff5f0' : '#f0faf4', border: '1px solid', borderColor: message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? '#f3d5cc' : '#c3e8d4', fontSize: 13, color: message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? '#8a3520' : '#2a7d4f' }} role="status">
          {message.toLowerCase().includes('error') || message.toLowerCase().includes('unable') ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          <span>{message}</span>
        </div>
      ) : null}

      {/* Create/Edit Form */}
      {role === 'owner' && formOpen ? (
        <div className="os-card">
          <div className="os-card-head">
            <span className="os-step-num">{editingId ? <Edit2 size={13} /> : '+'}</span>
            <div>
              <strong>{editingId ? 'Edit Staff Account' : 'Create Staff Account'}</strong>
              <p>{editingId ? 'Update the employee details below' : 'Add a new team member to the system'}</p>
            </div>
            <button type="button" onClick={closeForm} style={{ marginLeft: 'auto', padding: '5px 12px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
          <form onSubmit={saveStaff} className="os-card-body os-grid-2">
            <label className="os-field">
              <span>Full Name</span>
              <input value={form.displayName} onChange={(event) => updateForm('displayName', event.target.value)} placeholder="e.g. Segun Adeyemi" required />
            </label>
            <label className="os-field">
              <span>Phone Number</span>
              <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="08012345678" required />
            </label>
            <label className="os-field">
              <span>{editingId ? 'New PIN (optional)' : 'Login PIN'}</span>
              <input type="password" value={form.pin} onChange={(event) => updateForm('pin', event.target.value)} placeholder="4–6 digit PIN" required={!editingId} />
            </label>
            <label className="os-field">
              <span>Role</span>
              <select value={form.role} onChange={(event) => updateForm('role', event.target.value)}>
                {roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="os-field">
              <span>Store</span>
              <select value={form.store} onChange={(event) => updateForm('store', event.target.value)}>
                <option value="all">All Stores</option>
                {stores.map((store) => <option key={store.key} value={store.key}>{store.name.replace(/\s+Store$/i, '')}</option>)}
                <option value="production">Production</option>
              </select>
            </label>
            <label className="os-field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </label>
            <label className="os-field">
              <span>Date of Birth <em style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</em></span>
              <input type="date" value={form.dateOfBirth} onChange={(event) => updateForm('dateOfBirth', event.target.value)} />
            </label>
            {form.role === 'tailor' ? (
              <>
                <label className="os-field">
                  <span>Tailor Department</span>
                  <select value={form.tailorDepartment} onChange={(event) => updateForm('tailorDepartment', event.target.value)} required>
                    <option value="">Select department</option>
                    <option value="native">Native</option>
                    <option value="suit">Suits</option>
                    <option value="trouser">Trouser</option>
                    <option value="finishing">Finishing</option>
                  </select>
                </label>
                <label className="os-field">
                  <span>Initial Grade</span>
                  <select value={form.tailorGrade} onChange={(event) => updateForm('tailorGrade', event.target.value)}>
                    <option value="">Not graded</option>
                    {[1, 2, 3, 4, 5].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
                  </select>
                </label>
              </>
            ) : null}
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="os-release-btn" type="submit" disabled={saving} style={{ maxWidth: 260 }}>
                <CheckCircle size={16} strokeWidth={2} />
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Staff Table */}
      <div className="os-card">
        <div className="os-card-head">
          <Users size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div><strong>Staff Directory</strong><p>All active and inactive team members</p></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Role', 'Store', 'Status', 'Last Login', 'Department', 'Grade', ...(role === 'owner' ? ['Actions'] : [])].map((h) => (
                  <th key={h} style={{ padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffUsers.map((person, idx) => (
                <tr key={person.id} style={{ borderBottom: idx < staffUsers.length - 1 ? '1px solid #f3ede5' : 'none', background: 'white' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1611', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {person.displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{person.displayName}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', textTransform: 'capitalize' }}>{person.role.replaceAll('_', ' ')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', textTransform: 'capitalize' }}>{person.store}</td>
                  <td style={{ padding: '12px 14px' }}><Status>{person.status}</Status></td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#8a7a6a', whiteSpace: 'nowrap' }}>{person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', textTransform: 'capitalize' }}>{person.role === 'tailor' ? person.tailorDepartment || 'Not set' : '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {person.role === 'tailor' ? (
                      role === 'owner' ? (
                        <select
                          value={person.tailorGrade || ''}
                          onChange={(event) => updateTailorGrade(person, event.target.value)}
                          aria-label={`Grade for ${person.displayName}`}
                          style={{ padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, fontSize: 12, color: '#1a1611', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="" disabled>Not graded</option>
                          {[1, 2, 3, 4, 5].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: person.tailorGrade ? '#faf7f3' : '#fff5f0', color: person.tailorGrade ? '#5a4e42' : '#8a7a6a', border: '1px solid #eee5da' }}>
                          {person.tailorGrade ? `Grade ${person.tailorGrade}` : 'Not graded'}
                        </span>
                      )
                    ) : <span style={{ color: '#b0a090', fontSize: 13 }}>—</span>}
                  </td>
                  {role === 'owner' ? (
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => openEdit(person)} style={{ padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Edit2 size={11} /> Edit
                        </button>
                        <button type="button" onClick={() => deleteStaff(person)} style={{ padding: '5px 10px', border: '1px solid #f3d5cc', borderRadius: 6, background: '#fff5f0', color: '#8a3520', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!staffUsers.length && (
                <tr>
                  <td colSpan={role === 'owner' ? 8 : 7} style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>No staff accounts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile staff cards */}
        {staffUsers.length > 0 && (
          <div style={{ display: 'none', flexDirection: 'column', gap: 10, padding: 14 }} className="staff-mobile-cards">
            {staffUsers.map((person) => (
              <div key={person.id} style={{ border: '1px solid #eee5da', borderRadius: 10, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1611', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {person.displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{person.displayName}</div>
                      <div style={{ fontSize: 12, color: '#8a7a6a', textTransform: 'capitalize' }}>{person.role.replaceAll('_', ' ')} · {person.store}</div>
                    </div>
                  </div>
                  <Status>{person.status}</Status>
                </div>
                {role === 'owner' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="button" onClick={() => openEdit(person)} style={{ flex: 1, padding: '7px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    <button type="button" onClick={() => deleteStaff(person)} style={{ flex: 1, padding: '7px', border: '1px solid #f3d5cc', borderRadius: 8, background: '#fff5f0', color: '#8a3520', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountsReportsDashboard({ report, from, to, setFrom, setTo, exportFormat, setExportFormat, exportReport, message }) {
  const [activeTab, setActiveTab] = useState('Commercial Activity');
  const summary = report.summary;
  const paidTotal = report.invoices.filter((invoice) => invoice.paymentStatus === 'Fully Paid').reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const pending = report.invoices.filter((invoice) => invoice.approvalStatus === 'Pending Accounts');
  const flagged = report.invoices.filter((invoice) => ['Flagged', 'Rejected'].includes(invoice.approvalStatus));
  const partial = report.invoices.filter((invoice) => invoice.paymentStatus === 'Partial Paid');
  const thStyle = { padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#5a4e42', borderBottom: '1px solid #f3ede5' };
  const trHover = { onMouseEnter: (e) => { e.currentTarget.style.background = '#faf7f3'; }, onMouseLeave: (e) => { e.currentTarget.style.background = 'white'; } };
  const kpiCards = [
    { label: 'Total Revenue', value: money.format(summary.totalInvoiced), detail: `${summary.invoiceCount} invoices`, color: '#c97b08', bg: '#fffbf0', icon: <TrendingUp size={17} strokeWidth={1.5} />, trending: true },
    { label: 'Paid Invoices', value: summary.fullyPaidCount, detail: money.format(paidTotal), color: '#2a7d4f', bg: '#f0faf4', icon: <CheckCircle size={17} strokeWidth={1.5} />, trending: true },
    { label: 'Pending Approval', value: summary.pendingApprovalCount, detail: money.format(pending.reduce((s, i) => s + toNumber(i.total), 0)), color: summary.pendingApprovalCount ? '#7a6030' : '#2a7d4f', bg: summary.pendingApprovalCount ? '#fffbf0' : '#f0faf4', icon: <Clock size={17} strokeWidth={1.5} />, trending: false },
    { label: 'Rejected / Flagged', value: flagged.length, detail: money.format(flagged.reduce((s, i) => s + toNumber(i.total), 0)), color: flagged.length ? '#8a3520' : '#2a7d4f', bg: flagged.length ? '#fff5f0' : '#f0faf4', icon: <AlertCircle size={17} strokeWidth={1.5} />, trending: false },
    { label: 'Partial Paid', value: partial.length, detail: `of ${summary.invoiceCount} invoices`, color: '#7a5230', bg: '#fdf6ee', icon: <CreditCard size={17} strokeWidth={1.5} />, trending: false },
    { label: 'Inventory Alerts', value: summary.lowStockCount, detail: 'Low or out of stock', color: summary.lowStockCount ? '#8a3520' : '#2a7d4f', bg: summary.lowStockCount ? '#fff5f0' : '#f0faf4', icon: <Boxes size={17} strokeWidth={1.5} />, trending: false },
  ];
  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <BarChart2 size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Reports &amp; Analytics</h2>
            <p>End-of-period summaries, approvals queue and export tools</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
            aria-label="Export format"
            style={{ padding: '8px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#1a1611', background: '#fff', cursor: 'pointer' }}
          >
            <option value="csv">CSV / Excel</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            type="button"
            onClick={exportReport}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Report Builder Card */}
      <div className="os-card">
        <div className="os-card-head">
          <Filter size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div><strong>Report Builder</strong><p>Filter by date range and export format</p></div>
        </div>
        <div className="os-card-body os-grid-2" style={{ paddingBottom: 18 }}>
          <label className="os-field">
            <span>From</span>
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="os-field">
            <span>To</span>
            <input type="date" value={to} min={from} max={todayIso()} onChange={(event) => setTo(event.target.value)} />
          </label>
          {/* Payment Status and Approval Status selects stood here with no
              handler behind them: choosing "Unpaid" left the report, and the
              file it exports, showing everything. The date range and the tabs
              below are what actually narrow this report. */}
        </div>
        {message ? (
          <div style={{ margin: '0 18px 18px', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: '#fff5f0', border: '1px solid #f3d5cc', fontSize: 13, color: '#8a3520' }} role="status">
            <AlertCircle size={14} /><span>{message}</span>
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="os-kpi-row os-kpi-row-3" style={{ gap: 12 }}>
        {kpiCards.map(({ label, value, detail, color, bg, icon, trending }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #eee5da', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1611', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e42', marginTop: 2 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#8a7a6a', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                {trending ? <TrendingUp size={10} style={{ color: '#2a7d4f' }} /> : <TrendingDown size={10} style={{ color: '#8a3520' }} />}
                {detail}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row: Payment Breakdown + Approval Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Payment Breakdown */}
        <div className="os-card">
          <div className="os-card-head">
            <CreditCard size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
            <div><strong>Payment Breakdown</strong><p>Distribution across payment states</p></div>
          </div>
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Paid in Full', value: summary.fullyPaidCount, color: '#2a7d4f', bg: '#f0faf4' },
              { label: 'Partial Paid', value: partial.length, color: '#7a6030', bg: '#fffbf0' },
              { label: 'Unpaid', value: Math.max(0, summary.invoiceCount - summary.fullyPaidCount - partial.length), color: '#4a6fa5', bg: '#f0f4ff' },
              { label: 'Flagged / Rejected', value: flagged.length, color: '#8a3520', bg: '#fff5f0' },
            ].map(({ label, value, color, bg }) => {
              const pct = summary.invoiceCount > 0 ? Math.round((value / summary.invoiceCount) * 100) : 0;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5a4e42', marginBottom: 4 }}>
                      <span>{label}</span>
                      <strong style={{ color: '#1a1611' }}>{value} <span style={{ fontWeight: 400, color: '#8a7a6a' }}>({pct}%)</span></strong>
                    </div>
                    <div style={{ height: 6, background: '#f3ede5', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid #eee5da', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a7a6a' }}>
              <span>Total invoices</span>
              <strong style={{ color: '#1a1611' }}>{summary.invoiceCount}</strong>
            </div>
          </div>
        </div>

        {/* Approval Status */}
        <div className="os-card">
          <div className="os-card-head">
            <CheckCircle size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
            <div><strong>Approval Status</strong><p>Accounts approval pipeline</p></div>
          </div>
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Approved', value: summary.approvedCount, color: '#2a7d4f', bg: '#f0faf4' },
              { label: 'Pending Accounts', value: summary.pendingApprovalCount, color: '#7a6030', bg: '#fffbf0' },
              { label: 'Flagged / Rejected', value: flagged.length, color: '#8a3520', bg: '#fff5f0' },
            ].map(({ label, value, color }) => {
              const pct = summary.invoiceCount > 0 ? Math.round((value / summary.invoiceCount) * 100) : 0;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5a4e42', marginBottom: 4 }}>
                      <span>{label}</span>
                      <strong style={{ color: '#1a1611' }}>{value} <span style={{ fontWeight: 400, color: '#8a7a6a' }}>({pct}%)</span></strong>
                    </div>
                    <div style={{ height: 6, background: '#f3ede5', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Quick Insights */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee5da', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { text: `${pending.length} invoice${pending.length !== 1 ? 's' : ''} awaiting approval.`, Icon: Clock, color: pending.length ? '#7a6030' : '#2a7d4f' },
                { text: `${flagged.length} invoice${flagged.length !== 1 ? 's' : ''} flagged or rejected.`, Icon: AlertTriangle, color: flagged.length ? '#8a3520' : '#2a7d4f' },
                { text: `${report.allocations.length} fabric allocation${report.allocations.length !== 1 ? 's' : ''} recorded.`, Icon: Boxes, color: '#7a5230' },
              ].map(({ text, Icon, color }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#5a4e42' }}>
                  <Icon size={13} style={{ color, marginTop: 1, flexShrink: 0 }} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval table */}
      {pending.length > 0 && (
        <div className="os-card">
          <div className="os-card-head">
            <Clock size={16} strokeWidth={1.5} style={{ color: '#7a6030' }} />
            <div><strong>Awaiting Approval</strong><p>{pending.length} invoice{pending.length !== 1 ? 's' : ''} pending accounts review</p></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Invoice', 'Customer', 'Store', 'Total', 'Payment'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 8).map((invoice) => (
                  <tr key={invoice.invoiceNumber} style={{ background: 'white' }} {...trHover}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: '#1a1611' }}>{invoice.invoiceNumber}</td>
                    <td style={tdStyle}>{invoice.customer}</td>
                    <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{invoice.store}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1611' }}>{money.format(invoice.total)}</td>
                    <td style={tdStyle}><Status>{invoice.paymentStatus}</Status></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commercial Activity Tabs */}
      <div className="os-card">
        <div className="os-card-head">
          <FileText size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div><strong>Commercial Activity</strong><p>All transactions in the selected period</p></div>
          <button type="button" onClick={exportReport} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={13} /> Export
          </button>
        </div>
        {/* Tab bar */}
        <div style={{ padding: '0 18px', borderBottom: '1px solid #eee5da' }}>
          <nav style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {['Commercial Activity', 'Payments', 'Lead Time', 'Inventory Reconciliation', 'Store Performance', 'Exports'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{ padding: '10px 14px', borderRadius: 0, border: 'none', background: 'none', color: activeTab === tab ? '#1a1611' : '#8a7a6a', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: activeTab === tab ? '2px solid #1a1611' : '2px solid transparent', transition: 'all 0.15s' }}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* How long an order actually takes, from the day the order sheet was
            raised to the day production marked it ready. Only finished orders
            count — one still in the shop has no lead time yet. */}
        {activeTab === 'Lead Time' && (() => {
          const lead = report.leadTime;
          if (!lead || !lead.completedCount) {
            return (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#8a7a6a', fontSize: 14 }}>
                No orders were completed in this period, so there is no lead time to report.
              </div>
            );
          }
          return (
            <div style={{ padding: 18, display: 'grid', gap: 16 }}>
              <div className="tailor-figures">
                <div className="tailor-figure green">
                  <small>Within the {lead.targetDays / 7}-week standard</small>
                  <strong>{lead.withinTargetPercent}%</strong>
                  <span>{lead.completedCount} order{lead.completedCount === 1 ? '' : 's'} completed</span>
                </div>
                <div className="tailor-figure blue">
                  <small>Delivered by the promised date</small>
                  <strong>{lead.onPromisePercent === null ? '—' : `${lead.onPromisePercent}%`}</strong>
                  <span>{lead.promisedCount} carried a delivery date</span>
                </div>
                <div className="tailor-figure gold">
                  <small>Average lead time</small>
                  <strong>{lead.averageDays} days</strong>
                  <span>Against a {lead.targetDays}-day standard</span>
                </div>
                <div className="tailor-figure purple">
                  <small>Longest in the period</small>
                  <strong>{lead.slowest[0] ? `${lead.slowest[0].days} days` : '—'}</strong>
                  <span>{lead.slowest[0]?.customer || 'Nothing to show'}</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Order', 'Customer', 'Days taken', 'Within standard', 'Promised date'].map((heading) => (
                      <th key={heading} style={thStyle}>{heading}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {lead.slowest.map((order) => (
                      <tr key={order.invoiceNumber} style={{ background: 'white' }} {...trHover}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{order.invoiceNumber}</td>
                        <td style={tdStyle}>{order.customer}</td>
                        <td style={tdStyle}>{order.days}</td>
                        <td style={tdStyle}>
                          <span style={{ color: order.withinTarget ? '#2a7d4f' : '#8a3520', fontWeight: 700 }}>
                            {order.withinTarget ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {order.promised
                            ? `${new Date(`${order.promised}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}${order.onPromise ? '' : ' · late'}`
                            : 'None given'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#8a7a6a', lineHeight: 1.55 }}>
                The standard comes from Settings — Production, standard lead time. Change it there and
                this percentage is measured against the new figure.
              </p>
            </div>
          );
        })()}

        {/* Tab: Commercial Activity */}
        {activeTab === 'Commercial Activity' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Invoice', 'Customer', 'Store', 'Total', 'Payment', 'Approval', 'Order Status'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.invoices.length ? report.invoices.slice(0, 12).map((invoice) => (
                  <tr key={invoice.invoiceNumber} style={{ background: 'white' }} {...trHover}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#8a7a6a', fontSize: 12 }}>{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: '#1a1611', fontSize: 12 }}>{invoice.invoiceNumber}</td>
                    <td style={tdStyle}>{invoice.customer}</td>
                    <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{invoice.store}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1611' }}>{money.format(invoice.total)}</td>
                    <td style={tdStyle}><Status>{invoice.paymentStatus}</Status></td>
                    <td style={tdStyle}><Status>{invoice.approvalStatus}</Status></td>
                    <td style={tdStyle}><Status>{invoice.orderStatus}</Status></td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>No invoices in this period.</td></tr>
                )}
              </tbody>
            </table>
            {report.invoices.length > 0 && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid #eee5da', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#8a7a6a' }}>Showing {Math.min(12, report.invoices.length)} of {report.invoices.length} invoices</span>
              </div>
            )}
          </div>
        )}

        {/* Tab: Payments */}
        {activeTab === 'Payments' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Invoice', 'Customer', 'Store', 'Total', 'Payment Status'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.invoices.map((invoice) => (
                  <tr key={invoice.invoiceNumber} style={{ background: 'white' }} {...trHover}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: '#1a1611', fontSize: 12 }}>{invoice.invoiceNumber}</td>
                    <td style={tdStyle}>{invoice.customer}</td>
                    <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{invoice.store}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1611' }}>{money.format(invoice.total)}</td>
                    <td style={tdStyle}><Status>{invoice.paymentStatus}</Status></td>
                  </tr>
                ))}
                {!report.invoices.length && (
                  <tr><td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>No payment data in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Inventory Reconciliation */}
        {activeTab === 'Inventory Reconciliation' && (
          <div>
            <div style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: '1px solid #eee5da', flexWrap: 'wrap' }}>
              {[
                { label: 'Total Items', value: summary.inventoryItemCount },
                { label: 'Allocated', value: summary.allocationCount },
                { label: 'Allocation Records', value: report.allocations.length },
                { label: 'Low Stock', value: summary.lowStockCount },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 16px', background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1611', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#8a7a6a' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Fabric', 'Quantity', 'Order', 'Customer', 'Tailor'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.allocations.length ? report.allocations.map((item, i) => (
                    <tr key={i} style={{ background: 'white' }} {...trHover}>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#8a7a6a', fontSize: 12 }}>{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1611' }}>{item.fabricName}</td>
                      <td style={tdStyle}>{item.quantity} {item.unit}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#5a4e42' }}>{item.invoiceNumber}</td>
                      <td style={tdStyle}>{item.customerName}</td>
                      <td style={tdStyle}>{item.tailorName}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>No allocations in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Store Performance */}
        {activeTab === 'Store Performance' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Store', 'Invoices', 'Total Revenue', 'Trend'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.storeBreakdown.length ? report.storeBreakdown.map((store, i) => (
                  <tr key={store.store} style={{ background: 'white' }} {...trHover}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1611', textTransform: 'capitalize' }}>{store.store}</td>
                    <td style={tdStyle}>{store.invoices}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1611' }}>{money.format(store.total)}</td>
                    <td style={tdStyle}>{i % 2 === 0 ? <TrendingUp size={14} style={{ color: '#2a7d4f' }} /> : <TrendingDown size={14} style={{ color: '#8a3520' }} />}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>No store data in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Exports */}
        {activeTab === 'Exports' && (
          <div>
            <div style={{ padding: '18px', borderBottom: '1px solid #eee5da', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className="os-field" style={{ flex: 1, minWidth: 160 }}>
                <span>Format</span>
                <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)} style={{ padding: '10px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 14 }}>
                  <option value="csv">CSV / Excel (.xlsx)</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <button
                type="button"
                onClick={exportReport}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                <Download size={14} /> Generate &amp; Download
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Report Name', 'Type', 'Date Generated', 'Date Range', 'Format', 'Action'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Invoices & Orders', 'Inventory Reconciliation', 'Payment Summary'].map((name) => (
                    <tr key={name} style={{ background: 'white' }} {...trHover}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1611' }}>{name}</td>
                      <td style={tdStyle}>Commercial Activity</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 12 }}>{new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 12 }}>{from} – {to}</td>
                      <td style={tdStyle}>Excel</td>
                      <td style={tdStyle}>
                        <button type="button" onClick={exportReport} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', color: '#5a4e42', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          <Download size={12} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bottom row: Inventory Summary + Store Performance + Top Customers */}
      <div className="os-kpi-row os-kpi-row-3" style={{ gap: 16 }}>
        {/* Inventory Reconciliation Summary */}
        <div className="os-card">
          <div className="os-card-head" style={{ padding: '12px 16px' }}>
            <Boxes size={14} strokeWidth={1.5} style={{ color: '#c97b08' }} />
            <div><strong style={{ fontSize: 13 }}>Inventory Summary</strong></div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['Total Items', summary.inventoryItemCount], ['Allocated', summary.allocationCount], ['Allocations logged', report.allocations.length], ['Low / Out of stock', summary.lowStockCount]].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3ede5' }}>
                <span style={{ fontSize: 12, color: '#5a4e42' }}>{label}</span>
                <strong style={{ fontSize: 13, color: '#1a1611' }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Store Performance */}
        <div className="os-card">
          <div className="os-card-head" style={{ padding: '12px 16px' }}>
            <BarChart2 size={14} strokeWidth={1.5} style={{ color: '#c97b08' }} />
            <div><strong style={{ fontSize: 13 }}>Store Performance</strong></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Store', 'Revenue', 'Inv.'].map((h) => (
                    <th key={h} style={{ ...thStyle, padding: '9px 12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.storeBreakdown.map((store, i) => (
                  <tr key={store.store} style={{ background: 'white' }} {...trHover}>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#1a1611', textTransform: 'capitalize' }}>{store.store}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#5a4e42' }}>{money.format(store.total)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#5a4e42' }}>{store.invoices}</td>
                  </tr>
                ))}
                {!report.storeBreakdown.length && (
                  <tr><td colSpan={3} style={{ padding: '20px 12px', textAlign: 'center', color: '#8a7a6a', fontSize: 12 }}>No data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers */}
        <div className="os-card">
          <div className="os-card-head" style={{ padding: '12px 16px' }}>
            <Users size={14} strokeWidth={1.5} style={{ color: '#c97b08' }} />
            <div><strong style={{ fontSize: 13 }}>Top Customers</strong></div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.invoices.slice(0, 5).map((invoice, i) => (
              <div key={invoice.invoiceNumber} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1611', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {invoice.customer.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1611', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invoice.customer}</div>
                  <div style={{ fontSize: 11, color: '#8a7a6a' }}>{money.format(invoice.total)}</div>
                </div>
              </div>
            ))}
            {!report.invoices.length && <div style={{ fontSize: 12, color: '#8a7a6a', padding: '8px 0' }}>No customer data.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ role }) {
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
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
    popup.document.write(`<!doctype html><html><head><title>twif End-of-Period Report</title><style>body{font-family:Arial,sans-serif;color:#171717;padding:32px}h1{margin-bottom:4px}p{color:#666}table{width:100%;border-collapse:collapse;margin:22px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#171717;color:#fff}@media print{body{padding:0}}</style></head><body><h1>twif End-of-Period Report</h1><p>${escape(from)} to ${escape(to)}</p><h2>Summary</h2><table><tbody>${summaryRows}</tbody></table><h2>Store Performance</h2><table><thead><tr><th>Store</th><th>Invoices</th><th>Total Invoiced</th></tr></thead><tbody>${storeRows}</tbody></table><h2>Invoices and Orders</h2><table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Store</th><th>Total</th><th>Payment</th><th>Order</th></tr></thead><tbody>${invoiceRows}</tbody></table><h2>Inventory Allocations</h2><table><thead><tr><th>Date</th><th>Fabric</th><th>Quantity</th><th>Order</th><th>Customer</th><th>Tailor</th></tr></thead><tbody>${allocationRows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };

  const exportReport = () => {
    if (!report) return;
    if (exportFormat === 'pdf') printPdf();
    else downloadCsv();
  };

  if (loading && !report) return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <BarChart2 size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div><h2>Reports &amp; Analytics</h2><p>End-of-period summaries and export tools</p></div>
        </div>
      </div>
      <div style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>Loading report…</div>
    </div>
  );
  if ((role === 'accounts' || role === 'owner') && report) return <AccountsReportsDashboard report={report} from={from} to={to} setFrom={setFrom} setTo={setTo} exportFormat={exportFormat} setExportFormat={setExportFormat} exportReport={exportReport} message={message} />;

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <BarChart2 size={22} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <h2>Reports &amp; Analytics</h2>
            <p>End-of-period summaries and export tools</p>
          </div>
        </div>
      </div>

      {/* Report Builder Card */}
      <div className="os-card">
        <div className="os-card-head">
          <Filter size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div><strong>Report Builder</strong><p>Select a date range and export format</p></div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value)}
              aria-label="Export format"
              style={{ padding: '8px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#1a1611', background: '#fff', cursor: 'pointer' }}
            >
              <option value="csv">CSV / Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              type="button"
              onClick={exportReport}
              disabled={!report}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: report ? '#1a1611' : '#f3ede5', color: report ? '#fff' : '#b0a090', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: report ? 'pointer' : 'default' }}
            >
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>
        <div className="os-card-body os-grid-2">
          <label className="os-field">
            <span>From</span>
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="os-field">
            <span>To</span>
            <input type="date" value={to} min={from} max={todayIso()} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        {message ? (
          <div style={{ margin: '0 18px 18px', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: '#fff5f0', border: '1px solid #f3d5cc', fontSize: 13, color: '#8a3520' }} role="status">
            <AlertCircle size={14} /><span>{message}</span>
          </div>
        ) : null}
      </div>

      {report ? (
        <>
          {/* KPI Stats Row 1 */}
          <div className="os-kpi-row" style={{ gap: 12 }}>
            {[
              { label: 'Total Invoiced', value: money.format(report.summary.totalInvoiced), detail: `${report.summary.invoiceCount} invoices`, color: '#c97b08', bg: '#fffbf0', icon: <FileText size={17} strokeWidth={1.5} /> },
              { label: 'Customers', value: String(report.summary.customerCount), detail: 'Unique in period', color: '#4a6fa5', bg: '#f0f4ff', icon: <Users size={17} strokeWidth={1.5} /> },
              { label: 'Active Orders', value: String(report.summary.activeOrderCount), detail: `${report.summary.readyOrderCount} ready`, color: '#2a7d4f', bg: '#f0faf4', icon: <Package size={17} strokeWidth={1.5} /> },
              { label: 'Pending Approval', value: String(report.summary.pendingApprovalCount), detail: `${report.summary.approvedCount} approved`, color: report.summary.pendingApprovalCount ? '#8a3520' : '#2a7d4f', bg: report.summary.pendingApprovalCount ? '#fff5f0' : '#f0faf4', icon: <Clock size={17} strokeWidth={1.5} /> },
            ].map(({ label, value, detail, color, bg, icon }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #eee5da', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1611', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e42', marginTop: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#8a7a6a' }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* KPI Stats Row 2 */}
          <div className="os-kpi-row" style={{ gap: 12 }}>
            {[
              { label: 'Fully Paid', value: String(report.summary.fullyPaidCount), detail: `${report.summary.partiallyPaidCount} partial`, color: '#2a7d4f', bg: '#f0faf4', icon: <CheckCircle size={17} strokeWidth={1.5} /> },
              { label: 'Allocations', value: String(report.summary.allocationCount), detail: 'Production usage', color: '#7a5230', bg: '#fdf6ee', icon: <Boxes size={17} strokeWidth={1.5} /> },
              { label: 'Low Stock', value: String(report.summary.lowStockCount), detail: `of ${report.summary.inventoryItemCount} items`, color: report.summary.lowStockCount ? '#8a3520' : '#2a7d4f', bg: report.summary.lowStockCount ? '#fff5f0' : '#f0faf4', icon: <AlertCircle size={17} strokeWidth={1.5} /> },
              { label: 'Active Staff', value: String(report.summary.activeStaffCount), detail: `${report.summary.staffAddedCount} added`, color: '#4a6fa5', bg: '#f0f4ff', icon: <Users size={17} strokeWidth={1.5} /> },
            ].map(({ label, value, detail, color, bg, icon }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #eee5da', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1611', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e42', marginTop: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#8a7a6a' }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Store Performance */}
          <div className="os-card">
            <div className="os-card-head">
              <BarChart2 size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
              <div><strong>Store Performance</strong><p>Revenue and invoice count by location</p></div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Store', 'Invoices', 'Total Invoiced'].map((h) => (
                      <th key={h} style={{ padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.storeBreakdown.map((store, idx) => (
                    <tr key={store.store} style={{ borderBottom: idx < report.storeBreakdown.length - 1 ? '1px solid #f3ede5' : 'none', background: 'white' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1a1611', textTransform: 'capitalize' }}>{store.store}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{store.invoices}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{money.format(store.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices and Orders */}
          <div className="os-card">
            <div className="os-card-head">
              <FileText size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
              <div><strong>Invoices &amp; Orders</strong><p>All commercial activity in the selected period</p></div>
            </div>
            {report.invoices.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Date', 'Invoice', 'Customer', 'Store', 'Total', 'Payment', 'Approval', 'Order'].map((h) => (
                        <th key={h} style={{ padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.invoices.map((invoice, idx) => (
                      <tr key={invoice.invoiceNumber} style={{ borderBottom: idx < report.invoices.length - 1 ? '1px solid #f3ede5' : 'none', background: 'white' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#8a7a6a', whiteSpace: 'nowrap' }}>{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1a1611' }}>{invoice.invoiceNumber}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#1a1611' }}>{invoice.customer}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', textTransform: 'capitalize' }}>{invoice.store}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{money.format(invoice.total)}</td>
                        <td style={{ padding: '12px 14px' }}><Status>{invoice.paymentStatus}</Status></td>
                        <td style={{ padding: '12px 14px' }}><Status>{invoice.approvalStatus}</Status></td>
                        <td style={{ padding: '12px 14px' }}><Status>{invoice.orderStatus}</Status></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>No invoices in this period.</div>
            )}
          </div>

          {/* Inventory Allocations */}
          <div className="os-card">
            <div className="os-card-head">
              <Boxes size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
              <div><strong>Inventory Allocations</strong><p>Fabric usage recorded by production in this period</p></div>
            </div>
            {report.allocations.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Date', 'Fabric', 'Quantity', 'Order', 'Customer', 'Tailor'].map((h) => (
                        <th key={h} style={{ padding: '11px 14px', background: '#faf7f3', fontSize: 11, fontWeight: 700, color: '#8a7a6a', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.allocations.map((allocation, index) => (
                      <tr key={`${allocation.invoiceNumber}-${allocation.date}-${index}`} style={{ borderBottom: index < report.allocations.length - 1 ? '1px solid #f3ede5' : 'none', background: 'white' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f3'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#8a7a6a', whiteSpace: 'nowrap' }}>{new Date(allocation.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{allocation.fabricName}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#1a1611' }}>{allocation.quantity} {allocation.unit}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: '#5a4e42' }}>{allocation.invoiceNumber}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{allocation.customerName}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{allocation.tailorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>No inventory allocations in this period.</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// Where each notification takes you when tapped. The metadata written by the
// API carries the event name and, where relevant, the invoice it refers to.
const notificationDestination = (item, role) => {
  const { event, invoiceNumber } = item?.metadata || {};
  const invoiceParams = invoiceNumber ? { invoice: invoiceNumber } : undefined;

  switch (event) {
    case 'invoice_created':
    case 'account_approval':
      return { view: 'Invoices', params: invoiceParams };
    case 'payment_recorded':
      // Accounts and the Owner keep the payment screens; a store manager is
      // told about the money against the order they raised.
      return { view: ['accounts', 'owner', 'admin'].includes(role) ? 'Payments' : 'Orders', params: invoiceParams };
    case 'production_override':
      return { view: ['production_manager'].includes(role) ? 'Production' : 'Orders', params: invoiceParams };
    case 'order_sheet_created':
    case 'order_sheet_released':
    case 'production_ready':
      return { view: role === 'store_manager' ? 'Orders' : 'Production' };
    case 'tailor_assigned':
      return { view: role === 'tailor' ? 'My Tasks' : 'Production' };
    case 'order_ready':
      return { view: role === 'store_manager' ? 'Orders' : 'Production' };
    case 'inventory_created':
    case 'inventory_edit_requested':
    case 'inventory_edit_approved':
    case 'inventory_edit_rejected':
    case 'fabric_allocated':
    case 'low_stock':
      return { view: 'Inventory' };
    case 'customer_updated':
    case 'customer_archived':
      return { view: 'Customers' };
    default:
      return invoiceNumber ? { view: 'Invoices', params: invoiceParams } : null;
  }
};

// Older rows predate server-side titles, and slicing the message at its first
// full stop just reproduced the message, so fall back to the channel instead.
const notificationTitle = (item, category) => item.metadata?.title
  || item.title
  || item.subject
  // Rows written before the API sent titles fall back to the category shown on
  // the row, so the headline and the chip never contradict each other.
  || (category ? `${category} update` : 'Notification');

const notificationTimestamp = (value) => {
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).replace(',', ' ·');
};

function NotificationPanel({ role, currentRole, onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest first');
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const displayName = currentRole?.name?.split(' (')[0] || '';
  const visibleNavForRole = navByRole[role] || [];

  useEffect(() => {
    setLoadFailed(false);
    api.get('/oms/notifications', { params: { role, name: displayName } })
      .then((response) => setItems(response.data?.data?.notifications || []))
      // A failed request must not look like an empty inbox — reading "0
      // notifications" when the server is unreachable is worse than an error.
      .catch(() => { setItems([]); setLoadFailed(true); })
      .finally(() => setLoading(false));
  }, [role, displayName]);

  const markAllRead = async () => {
    setError('');
    try {
      await api.patch('/oms/notifications/read-all', { role, name: displayName });
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new Event('oms-notifications-read'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not mark these as read. Try again.');
    }
  };

  // Where the notification's own destination is a screen this role does not
  // have, it falls back to one they do — a row that names an order should not
  // be dead just because the reader cannot reach Production.
  const reachable = (item) => {
    const destination = notificationDestination(item, role);
    if (destination && visibleNavForRole.includes(destination.view)) return destination;
    const { invoiceNumber } = item?.metadata || {};
    if (!invoiceNumber) return null;
    const fallback = ['Orders', 'Invoices', 'Production'].find((view) => visibleNavForRole.includes(view));
    return fallback ? { view: fallback, params: { invoice: invoiceNumber } } : null;
  };

  const openNotification = (item) => {
    const destination = reachable(item);
    if (!destination) return;
    onNavigate?.(destination.view, destination.params);
  };

  const isActionable = (item) => Boolean(reachable(item));

  if (role === 'store_manager' || role === 'accounts' || role === 'production_manager') {
    const notificationCategory = (item) => {
      const text = `${item.channel || ''} ${item.metadata?.title || ''} ${item.message || ''}`.toLowerCase();
      if (role === 'accounts' && (text.includes('inventory') || text.includes('stock') || text.includes('reconcil'))) return 'Inventory';
      if (role === 'production_manager') {
        if (text.includes('inventory') || text.includes('stock') || text.includes('fabric') || text.includes('allocation')) return 'Inventory';
        if (text.includes('tailor') || text.includes('assigned')) return 'Tailors';
        if (text.includes('system') || text.includes('maintenance')) return 'System';
        return 'Production';
      }
      if (text.includes('invoice')) return 'Invoices';
      if (text.includes('payment') || text.includes('paid')) return 'Payments';
      if (text.includes('system') || text.includes('customer') || text.includes('maintenance')) return 'System';
      return role === 'accounts' ? 'Invoices' : 'Orders';
    };
    const categories = role === 'accounts'
      ? ['All', 'Unread', 'Invoices', 'Payments', 'Inventory', 'System']
      : role === 'production_manager'
        ? ['All', 'Unread', 'Production', 'Inventory', 'Tailors', 'System']
        : ['All', 'Unread', 'Orders', 'Invoices', 'Payments', 'System'];
    const counts = Object.fromEntries(categories.map((name) => [name, name === 'All'
      ? items.length
      : name === 'Unread'
        ? items.filter((item) => !item.isRead).length
        : items.filter((item) => notificationCategory(item) === name).length]));
    const visibleItems = items
      .filter((item) => category === 'All' || (category === 'Unread' ? !item.isRead : notificationCategory(item) === category))
      .sort((a, b) => sortOrder === 'Newest first' ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt));
    const iconFor = (name) => ({ Orders: '✓', Invoices: '▤', Payments: '▣', Production: '▧', Inventory: '◇', Tailors: '♙', System: '⚙' }[name] || '♧');

    return (
      <section className="store-notifications">
        <header><div><span>Inbox</span><h2>{loadFailed ? 'Notifications unavailable' : `You have ${counts.Unread} unread notifications`}</h2></div><button type="button" onClick={markAllRead}>✓ &nbsp; Mark all as read</button></header>
        {error ? <div className="os-row-notice" role="status"><span>{error}</span></div> : null}
        <div className="store-notification-filters">
          <nav>{categories.map((name) => <button type="button" className={category === name ? 'active' : ''} onClick={() => setCategory(name)} key={name}>{name} <span>{counts[name]}</span></button>)}</nav>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option>Newest first</option><option>Oldest first</option></select>
        </div>
        <div className="store-notification-list">
          {loading ? <div className="invoice-preview-empty">Loading notifications...</div> : visibleItems.length ? visibleItems.map((item) => {
            const itemCategory = notificationCategory(item);
            const actionable = isActionable(item);
            return <article
              className={classNames(item.isRead ? 'read' : 'unread', actionable && 'notification-actionable')}
              key={item.id}
              role={actionable ? 'button' : undefined}
              tabIndex={actionable ? 0 : undefined}
              onClick={actionable ? () => openNotification(item) : undefined}
              onKeyDown={actionable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openNotification(item); } } : undefined}
            >
              <i className="unread-dot"/><span className={`notification-type-icon type-${itemCategory.toLowerCase()}`}>{iconFor(itemCategory)}</span>
              <div>
                <strong>{notificationTitle(item, itemCategory)}</strong>
                <p>{item.message}</p>
                <time dateTime={item.createdAt}>{notificationTimestamp(item.createdAt)}</time>
              </div>
              <b className={`notification-category type-${itemCategory.toLowerCase()}`}>{itemCategory === 'Orders' ? 'Order' : itemCategory === 'Payments' ? 'Payment' : itemCategory === 'Invoices' ? 'Invoice' : itemCategory}</b>
            </article>;
          }) : (
            <div className="invoice-preview-empty">
              {loadFailed ? 'Notifications could not be loaded. Check your connection and refresh.' : 'No notifications in this category.'}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <SectionHeader eyebrow="Inbox" title="Notifications">
        {items.some((item) => !item.isRead) ? <button type="button" onClick={markAllRead}>Mark all read</button> : null}
      </SectionHeader>
      {error ? <div className="os-row-notice" role="status"><span>{error}</span></div> : null}
      <div className="notification-list">
        {loading ? <div className="invoice-preview-empty">Loading notifications...</div> : items.length ? items.map((item) => {
          const actionable = isActionable(item);
          return (
            <article
              className={classNames(item.isRead ? 'notification-read' : 'notification-unread', actionable && 'notification-actionable')}
              key={item.id}
              role={actionable ? 'button' : undefined}
              tabIndex={actionable ? 0 : undefined}
              onClick={actionable ? () => openNotification(item) : undefined}
              onKeyDown={actionable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openNotification(item); } } : undefined}
            >
              <span>{item.channel}</span>
              <strong>{notificationTitle(item, item.channel)}</strong>
              <p>{item.message}</p>
              <small>{notificationTimestamp(item.createdAt)}</small>
            </article>
          );
        }) : (
          <div className="invoice-preview-empty">
            {loadFailed ? 'Notifications could not be loaded. Check your connection and refresh.' : 'No notifications for this account yet.'}
          </div>
        )}
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
              // No order sheet means production has not picked it up yet.
              status: 'Order Received',
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
  const steps = CUSTOMER_TRACKING_STEPS;
  const currentStep = Math.max(0, steps.indexOf(normalizedStatus));

  if (loading) {
    return (
      <main className="tracking-page">
        <section className="tracking-card">
          <div className="brand-lockup tracking-brand"><div className="mark">TW</div><strong>twif</strong></div>
          <p>Loading order status...</p>
        </section>
      </main>
    );
  }

  if (!tracking) {
    return (
      <main className="tracking-page">
        <section className="tracking-card">
          <div className="brand-lockup tracking-brand"><div className="mark">TW</div><strong>twif</strong></div>
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
              <strong>twif</strong>
              <span>The Way It Fits</span>
            </div>
          </div>
          <Status>{normalizedStatus}</Status>
        </div>

        <div className="tracking-hero">
          <span>{tracking.invoiceNumber}</span>
          <h1>{(tracking.items?.length ? tracking.items.map((item) => item.description).join(', ') : tracking.item) || 'Your order'}</h1>
          <p>{tracking.customer} · {tracking.store} Store</p>
        </div>

        {tracking.items?.length > 1 ? (
          <ul className="tracking-item-list">
            {tracking.items.map((item, index) => (
              <li key={`${item.description}-${index}`}>
                <span>{item.description}</span>
                <span>{item.quantity} {item.quantity === 1 ? 'piece' : 'pieces'}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="tracking-steps">
          {steps.map((step, index) => (
            <div
              className={classNames('tracking-step', index === currentStep && 'active', index < currentStep && 'done')}
              key={step}
            >
              <span>{index < currentStep ? '✓' : index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>

        <dl className="tracking-details">
          <div><dt>Delivery date</dt><dd>{tracking.deliveryDate ? formatMoment(tracking.deliveryDate) : 'To be confirmed'}</dd></div>
          <div><dt>Pieces</dt><dd>{tracking.pieces || 1}</dd></div>
          <div><dt>Fabric</dt><dd>{tracking.fabric || 'To be confirmed'}</dd></div>
          <div><dt>Style images</dt><dd>{tracking.styleImagesCount || 0} uploaded</dd></div>
        </dl>

        <p className="tracking-note">
          This page updates from the order sheet and production status managed by twif.
        </p>

        {/* "Back to tracking" sat on the tracking page itself and went nowhere. */}
        <div className="tracking-actions">
          <a className="tracking-profile-button" href={`/c/${encodeURIComponent(token)}/profile`}>
            Go to my profile
            <span aria-hidden="true">→</span>
          </a>
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
          <div className="brand-lockup tracking-brand"><div className="mark">TW</div><strong>twif</strong></div>
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
      <aside className="client-portal-nav"><div className="brand-lockup tracking-brand"><div className="mark">TW</div><div><strong>twif</strong><span>The Way It Fits</span></div></div>{/* Nine links pointed at anchors that did not exist, so only the first
              one did anything. These are the sections the page actually has,
              and each now scrolls to it. */}
          <nav>{[['⌂','Dashboard','portal-top'],['▣','Order History','order-history'],['♙','Contact Details','contact-details'],['♧','Membership','membership'],['♡','Saved Styles','saved-styles']].map(([icon,label,anchor],index)=><a className={index===0?'active':''} href={`#${anchor}`} key={label}><i>{icon}</i>{label}</a>)}</nav><section><strong>Need help?</strong><small>Chat with us on WhatsApp</small><a href="https://wa.me/2347056336710">◉ &nbsp; Chat Now</a></section><a className="portal-logout" href={`/c/${encodeURIComponent(token)}`}>← &nbsp; Back to tracking</a></aside>
      <section className="client-portal-workspace" id="portal-top"><header><div><span>Client Portal</span><strong>{profile.name}</strong></div><a className="client-portal-back" href={`/c/${encodeURIComponent(token)}`}>← &nbsp;Back to tracking</a></header><div className="client-portal-welcome"><p>Welcome back,</p><h1>{profile.name}</h1><span>⌕ &nbsp; {profile.phone || 'Phone not added'} &nbsp;&nbsp;·&nbsp;&nbsp; ✉ &nbsp; {profile.email}</span></div>
        <div className="client-portal-dashboard">
          <main>
            <article className="client-current-order"><header><div><h2>Your Current Order</h2><strong>{currentOrder?.items?.map((item)=>item.description).join(', ') || 'No active order'}</strong><p>Order No. {currentOrder?.invoiceNumber || '—'} &nbsp; • &nbsp; {(() => { const qty = currentOrder?.items?.reduce((sum,item)=>sum+toNumber(item.quantity),0)||0; return <>{qty} {qty === 1 ? 'piece' : 'pieces'}</>; })()} &nbsp; • &nbsp; {currentOrder?.store || '—'} Store</p></div><Status>{currentOrder?.orderStatus || 'No order'}</Status></header><div className="client-portal-steps">{CUSTOMER_TRACKING_STEPS.map((step,index)=>{const current=Math.max(0,CUSTOMER_TRACKING_STEPS.indexOf(customerStatus(currentOrder?.orderStatus)));return <div className={classNames('tracking-step',index===current&&'active',index<current&&'done')} key={step}><span>{index<current?'✓':index+1}</span><strong>{step}</strong></div>;})}</div><dl><div><dt>Delivery Date</dt><dd>{currentOrder?.deliveryDate ? new Date(`${String(currentOrder.deliveryDate).slice(0,10)}T00:00:00`).toLocaleDateString('en-GB') : 'To be confirmed'}</dd></div><div><dt>Tailor</dt><dd>{currentOrder?.tailor || 'To be assigned'}</dd></div><div><dt>Fabric</dt><dd>{currentOrder?.fabric || 'To be confirmed'}</dd></div><div><dt>Style Images</dt><dd>{currentOrder?.styleImages?.length || 0} uploaded</dd></div></dl><a href="#order-history">View Order Details &nbsp;›</a></article>
            <section className="client-portal-triple" id="order-history"><article><header><h2>Order History</h2></header>{profile.invoices.slice(0,4).map((invoice)=><div className="client-list-row" key={invoice.invoiceNumber}><span><small>{invoice.invoiceNumber}</small><strong>{invoice.items.map((item)=>item.description).join(', ')}</strong><small>{(() => { const qty = invoice.items.reduce((sum,item)=>sum+toNumber(item.quantity),0); return <>{qty} {qty === 1 ? 'piece' : 'pieces'}</>; })()} &nbsp; • &nbsp; {invoice.store} Store</small></span><Status>{invoice.orderStatus}</Status></div>)}</article><article><header><h2>Invoices</h2></header>{profile.invoices.slice(0,4).map((invoice)=><div className="client-list-row" key={invoice.invoiceNumber}><span><small>{invoice.invoiceNumber}</small><strong>{money.format(invoice.total)}</strong><small>{invoice.paymentStatus}</small></span><time>{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</time></div>)}</article><article><header><h2>Measurements</h2></header><div className="client-measure-card"><i>⌁</i><strong>Your measurements</strong><p>{Object.keys(measurements).filter((key)=>key!=='profile').length ? 'We have your latest measurements saved.' : 'Measurements have not been saved yet.'}</p></div></article></section>
            <section className="client-portal-bottom"><article id="contact-details"><header><h2>Contact Details</h2></header><p>⌕ &nbsp; {profile.phone || 'Not provided'}</p><p>✉ &nbsp; {profile.email}</p><p>⌖ &nbsp; {details.address || 'Address not provided'}</p></article><article id="saved-styles"><header><h2>Saved Styles</h2></header><div className="client-saved-styles">{savedStyles.length ? savedStyles.map((image,index)=><img src={image.url || image.dataUrl || image} alt={`Saved style ${index+1}`} key={image.url || image.dataUrl || index}/>) : <p>Your saved style references will appear here.</p>}</div></article><article><header><h2>Address Book</h2></header><p><strong>⌖ &nbsp; Home</strong><br/>{details.address || 'No saved address'}</p><p><strong>⌖ &nbsp; Preferred Store</strong><br/>{details.preferredStore || currentOrder?.store || 'Lekki'} Store</p></article></section>
          </main>
          <aside className="client-membership" id="membership"><header>♕ &nbsp; Your membership — Regular</header><p>Here’s where you stand this year:</p><label>Spend <strong>{money.format(profile.totalSpend)} of {money.format(spendGoal)}</strong><span><i style={{width:`${spendProgress}%`}}/></span><b>{spendProgress}%</b></label><label>Purchases <strong>{profile.totalOrders} of {purchaseGoal}</strong><span><i style={{width:`${purchaseProgress}%`}}/></span><b>{purchaseProgress}%</b></label><p>You need both <strong>{money.format(Math.max(0,spendGoal-profile.totalSpend))}</strong> more in spend and <strong>{Math.max(0,purchaseGoal-profile.totalOrders)} more purchases</strong> to qualify for Elite membership.</p></aside>
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
  if (activeView === 'Overview') return <Overview role={role} currentRole={viewProps.currentRole} sentInvoices={viewProps.sentInvoices} productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} onApproveInvoice={viewProps.onApproveInvoice} onNavigate={viewProps.onNavigate} />;
  if (activeView === 'Invoices') {
    if (role === 'accounts') return <AccountsInvoicesPage sentInvoices={viewProps.sentInvoices} onApproveInvoice={viewProps.onApproveInvoice} />;
    if (['store_manager', 'owner', 'admin'].includes(role)) {
      return (
        <StoreInvoicesView
          sentInvoices={viewProps.sentInvoices}
          currentRole={viewProps.currentRole}
          onInvoiceSent={viewProps.onInvoiceSent}
          onApproveInvoice={viewProps.onApproveInvoice}
          onInvoiceChanged={viewProps.onInvoiceUpdated}
          onInvoiceDeleted={viewProps.onInvoiceDeleted}
        />
      );
    }
    return <OrdersView sentInvoices={viewProps.sentInvoices} />;
  }
  if (activeView === 'Orders') return ['store_manager', 'owner', 'admin'].includes(role) ? <StoreManagerOrdersPage sentInvoices={viewProps.sentInvoices} onNavigate={viewProps.onNavigate} /> : <OrdersView sentInvoices={viewProps.sentInvoices} />;
  if (activeView === 'Customers') return role === 'store_manager' || role === 'owner' || role === 'admin' ? <StoreManagerCustomersPage sentInvoices={viewProps.sentInvoices} onNavigate={viewProps.onNavigate} currentRole={viewProps.currentRole} /> : <CustomersView />;
  if (activeView === 'New Invoice') return <NewInvoiceView currentRole={viewProps.currentRole} onInvoiceSent={viewProps.onInvoiceSent} />;
  if (activeView === 'Order Sheet') return <OrderSheetView sentInvoices={viewProps.sentInvoices} onCreateJob={viewProps.onCreateJob} />;
  if (activeView === 'Payments') return role === 'accounts' || role === 'owner'
    ? <AccountsPaymentsPage sentInvoices={viewProps.sentInvoices} onInvoiceUpdated={viewProps.onInvoiceUpdated} />
    : <PaymentsView sentInvoices={viewProps.sentInvoices} onApproveInvoice={viewProps.onApproveInvoice} />;
  if (activeView === 'Production') return <ProductionView productionJobs={viewProps.productionJobs} blockedJobs={viewProps.blockedProductionJobs} onUpdateJob={viewProps.onUpdateJob} currentRole={viewProps.currentRole} onOverrideHold={viewProps.onOverrideHold} />;
  if (activeView === 'Inventory') return role === 'accounts' ? <AccountsInventoryReconciliationPage /> : role === 'inventory_manager' ? <InventoryListPage currentRole={viewProps.currentRole} /> : role === 'owner' ? <InventoryListPage currentRole={viewProps.currentRole} ownerMode /> : <InventoryView />;
  if (activeView === 'Reconciliations') return <InventoryView />;
  if (activeView === 'Staff') return <StaffView role={role} currentRole={viewProps.currentRole} />;
  if (activeView === 'Tailors & Staff') return <StaffView role={role} currentRole={viewProps.currentRole} />;
  if (activeView === 'User Management') return <UserManagementPage currentRole={viewProps.currentRole} />;
  if (activeView === 'Stores') return <OwnerStoresPage sentInvoices={viewProps.sentInvoices} />;
  if (activeView === 'Memberships') return <MembershipsPage />;
  if (activeView === 'Shopify Sync') return <ShopifySyncPage />;
  if (activeView === 'Settings') return <SettingsPage />;
  if (activeView === 'Reports') return <ReportsView role={role} />;
  if (activeView === 'My Tasks') return <MyTasksPage currentRole={viewProps.currentRole} productionJobs={viewProps.productionJobs} onUpdateJob={viewProps.onUpdateJob} />;
  if (activeView === 'My Log') return <WeeklyLogPage currentRole={viewProps.currentRole} productionJobs={viewProps.productionJobs} />;
  if (activeView === 'Tailor List') return <TailorReportsPage mode="list" productionJobs={viewProps.productionJobs} />;
  if (activeView === 'Tailor Performance') return <TailorReportsPage mode="performance" productionJobs={viewProps.productionJobs} />;
  if (activeView === 'Notifications') return <NotificationPanel role={role} currentRole={viewProps.currentRole} onNavigate={viewProps.onNavigate} />;
  return <Overview role={role} />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const restoredSession = useMemo(sessionFromStorage, []);
  const [role, setRole] = useState(restoredSession?.role || null);
  const visibleNav = navByRole[role];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sentInvoices, setSentInvoices] = useState([]);
  // How much of an invoice has to be paid before production may start. Held in
  // Settings so the shop can change it without a deploy.
  const [releasePercent, setReleasePercent] = useState(DEFAULT_RELEASE_PERCENT);
  const [productionJobs, setProductionJobs] = useState([]);
  const [signedInAccount, setSignedInAccount] = useState(restoredSession);
  const [staffProfile, setStaffProfile] = useState(null);
  // Explains an automatic sign-out on the login screen, so a staff member who
  // returns to a logged-out device knows why rather than assuming a fault.
  const [signOutReason, setSignOutReason] = useState(
    expiredOnLoad() ? 'Signed out after 8 hours of inactivity. Please sign in again.' : ''
  );
  const signedIn = Boolean(role && signedInAccount);

  // Local storage says who the browser thinks it is; the server says who the
  // token actually belongs to. A token that has expired or been revoked sends
  // the person back to the login screen rather than leaving them in a shell
  // whose every request fails.
  useEffect(() => {
    if (!signedIn) return undefined;
    let live = true;

    api.get('/oms/auth/me')
      .then((response) => {
        const staff = response.data?.data?.staff;
        if (!live || !staff) return;
        setSignedInAccount((current) => ({
          ...current,
          role: staff.role,
          phone: staff.phone,
          name: staff.displayName,
          store: staff.store,
          profileImageUrl: staff.profileImageUrl || current?.profileImageUrl,
        }));
        setRole(staff.role);
      })
      .catch((error) => {
        if (!live || error.response?.status !== 401) return;
        handleLogout('Your session has ended. Please sign in again.');
      });

    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const requestedViewSlug = pathSegments[0] === roleSlug(role) ? pathSegments[1] : '';
  const activeView = visibleNav?.find((item) => viewSlug(item) === requestedViewSlug)
    || visibleNav?.[0] || 'Overview';

  const currentRole = useMemo(() => {
    const roleDetails = roles.find((item) => item.id === role);
    if (!roleDetails) return null;
    return {
      ...roleDetails,
      ...signedInAccount,
      name: staffProfile?.displayName || roleDetails.name,
      profileImageUrl: staffProfile?.profileImageUrl || '',
      // Who this actually is, as the server knows them. Used where ownership
      // matters — a display name is not unique enough to decide that.
      staffId: staffProfile?.id || null,
    };
  }, [role, signedInAccount, staffProfile]);

  // Refetched whenever the view changes, so the dashboard counts and lists
  // reflect what other staff have added rather than a snapshot taken at login.
  // Keyed on the view rather than the full path, so drilling into a record
  // does not re-request.
  // The payment gate reads from Settings, so the board has to know what the
  // threshold currently is rather than assuming the default.
  useEffect(() => {
    if (!signedIn) return;
    api.get('/oms/settings')
      .then((response) => {
        const value = Number(response.data?.data?.settings?.paymentReleasePercent);
        if (Number.isFinite(value)) setReleasePercent(value);
      })
      .catch(() => {});
  }, [signedIn]);

  // Bumped to ask for the orders again without changing view — used when the
  // app comes back to the foreground.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;

    // The customer list comes along so a job whose order sheet was raised
    // before the customer was measured can still find their figures.
    Promise.all([api.get('/oms/invoices/sent'), api.get('/oms/customers').catch(() => null)])
      .then(([invoiceResponse, customerResponse]) => {
        if (cancelled) return;
        const invoices = invoiceResponse.data?.data?.invoices || [];
        const profiles = customerResponse?.data?.data?.customers || [];
        setSentInvoices(invoices);
        setProductionJobs(invoices.map((invoice) => productionJobFromInvoice(invoice, profiles)).filter(Boolean));
      })
      .catch(() => {
        // Keep the local cache visible if the API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn, activeView, refreshTick]);

  // A phone that has been asleep wakes showing whatever was on screen when it
  // slept: nothing refetches, because the view has not changed. Coming back to
  // the app asks for the orders again, which is what the reader expects to see.
  useEffect(() => {
    if (!signedIn) return undefined;

    // Only when it has been away long enough to have missed something —
    // otherwise switching apps for a moment would refetch on every return.
    let leftAt = 0;
    const STALE_AFTER = 30 * 1000;

    const onHidden = () => { leftAt = Date.now(); };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return onHidden();
      if (leftAt && Date.now() - leftAt < STALE_AFTER) return undefined;
      leftAt = 0;
      setRefreshTick((tick) => tick + 1);
      return undefined;
    };

    document.addEventListener('visibilitychange', onVisible);
    // iOS Safari does not always fire visibilitychange when returning from the
    // lock screen, but it does fire pageshow.
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('focus', onVisible);
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

  // Stacked table rows on mobile take their labels from the column headers.
  useLabelledTables(location.pathname);
  // Horizontal card rows show how many cards there are and where you are.
  useCarouselIndicators(location.pathname);

  // React Router keeps the previous scroll offset when the view changes, which
  // lands you part-way down — or at the bottom of — the page you just opened.
  // The rAF re-run covers the browser restoring its own offset after paint.
  useEffect(() => {
    const toTop = () => window.scrollTo(0, 0);
    toTop();
    const frame = window.requestAnimationFrame(toTop);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    if (!signedIn || location.pathname.startsWith('/c/')) return;
    const basePath = `/${roleSlug(role)}`;
    const validSlugs = new Set((visibleNav || []).map(viewSlug));
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

  // Accounts recording a payment changes what production may pick up, so the
  // fresh invoice has to reach the shared list the gate reads from.
  const applyInvoiceUpdate = (invoice) => {
    if (!invoice?.invoiceNumber) return;
    setSentInvoices((current) => current.map((item) => (
      item.invoiceNumber === invoice.invoiceNumber ? invoice : item
    )));
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
      // The job's own status is saved, not the customer-facing label. Sending
      // customerStatus() here overwrote 'Assigned' with 'Order Received' and
      // 'Ready' with 'Ready for Collection', so after a reload the job matched
      // none of the production board's states and dropped out of every count.
      // The server derives what the customer is shown from this value.
      api.patch(`/oms/tracking/order-sheet/${updatedJob.trackingToken}`, updatedJob).catch(() => {});
    }
  };

  // An Owner or Admin releasing an order the payment gate is holding. The
  // server records who did it and why, and tells the shop.
  const overrideProductionHold = async (job, reason) => {
    if (!job?.trackingToken) return;
    const confirmed = window.confirm(
      `${job.customer}'s order is held: ${reason}.\n\nSend it to production anyway? This is recorded against the order.`
    );
    if (!confirmed) return;
    try {
      const response = await api.patch(`/oms/tracking/order-sheet/${job.trackingToken}`, {
        ...job,
        overrideProductionHold: true,
      });
      const sheet = response.data?.data?.orderSheet;
      setProductionJobs((current) => current.map((item) => (
        item.id === job.id ? { ...item, productionOverride: sheet?.productionOverride || { reason } } : item
      )));
    } catch (error) {
      window.alert(error.response?.data?.message || 'That order could not be released.');
    }
  };

  // Only jobs that may actually be worked reach the board and the tailors.
  const approvedProductionJobs = productionJobs.filter((job) => canShowJobInProduction(job, sentInvoices, releasePercent));

  // The rest are held, each with the reason, so Production can see what is
  // stuck and chase it rather than wondering where an order went.
  const blockedProductionJobs = productionJobs
    .map((job) => ({ job, reason: productionBlockReason(job, sentInvoices, releasePercent) }))
    .filter((entry) => entry.reason);

  const handleLogin = (account) => {
    setRole(account.role);
    setSignedInAccount(account);
    setStaffProfile(null);
    window.localStorage.setItem(OMS_SESSION_KEY, JSON.stringify({
      role: account.role, phone: account.phone, label: account.label, name: account.name,
    }));
    markActive();
    setMobileMenuOpen(false);
    navigate(`/${roleSlug(account.role)}/${viewSlug(navByRole[account.role][0])}`, { replace: true });
  };

  const handleLogout = (reason = '') => {
    clearSessionStorage();
    setRole(null);
    setSignedInAccount(null);
    setStaffProfile(null);
    setMobileMenuOpen(false);
    setSignOutReason(reason);
    navigate('/login', { replace: true });
  };

  // Idle timeout. Activity refreshes the stamp; a minute-by-minute check ends
  // the session once 8 hours have passed with none. The visibility check
  // catches a device that was simply asleep, where no timer would have fired.
  useEffect(() => {
    if (!signedIn) return undefined;

    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    const onActivity = () => markActive();
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));

    const endIfIdle = () => {
      const lastActive = readLastActive();
      if (lastActive && Date.now() - lastActive <= IDLE_LIMIT_MS) return;
      handleLogout('Signed out after 8 hours of inactivity. Please sign in again.');
    };

    const intervalId = window.setInterval(endIfIdle, 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') endIfIdle(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      events.forEach((name) => window.removeEventListener(name, onActivity));
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn]);

  // `params` lets a dashboard tile land on a view with a filter already applied
  // — e.g. Awaiting Payment opens Invoices already narrowed to unpaid ones.
  const openView = (view, params) => {
    setMobileMenuOpen(false);
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    navigate(`/${roleSlug(role)}/${viewSlug(view)}${query}`);
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
    return <LoginPage onLogin={handleLogin} notice={signOutReason} />;
  }

  return (
    <div className={classNames('app-shell', mobileMenuOpen && 'menu-open', role === 'production_manager' && 'production-role-shell', role === 'accounts' && 'accounts-role-shell', role === 'store_manager' && 'store-role-shell', role === 'owner' && 'owner-role-shell', role === 'tailor' && 'tailor-role-shell')}>
      {mobileMenuOpen && <button className="drawer-scrim" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-lockup">
          <div className="mark">TW</div>
          <div>
            <strong>twif</strong>
            <span>The Way It Fits</span>
          </div>
        </div>
        <nav>
          {visibleNav.map((item) => {
            const IconComp = NAV_ICONS[item];
            return (
              <NavLink
                className={({ isActive }) => isActive ? 'active' : ''}
                key={item}
                to={`/${roleSlug(role)}/${viewSlug(item)}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {IconComp && <IconComp size={16} />}
                {item}
              </NavLink>
            );
          })}
        </nav>
        {role === 'production_manager' ? (
          <div className="production-shortcuts">
            <span>Shortcuts</span>
            {[['Active Jobs', Activity], ['Assign Tailor', Users], ['Fabric Allocation', Boxes], ['Production Notes', ClipboardList]].map(([label, Icon]) => (
              <button type="button" key={label} onClick={() => openView('Production')}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        ) : null}
        {/* Who is signed in, and the account actions, both live at the foot of
            the navigation — where they are looked for — rather than in the
            corner of the top bar. The avatar is still the control for changing
            the profile photo. */}
        <div className="sidebar-footer">
          <div className="sidebar-identity">
            <ProfilePhotoControl
              account={currentRole}
              onProfileImageChange={(profileImageUrl) => setStaffProfile((current) => ({ ...current, profileImageUrl }))}
            />
            <span className="user-identity">
              <strong>{currentRole?.name?.split(' (')[0]}</strong>
              <small>{accountTypeByRole[role]?.short || currentRole?.label}</small>
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={() => handleLogout()}>
            <LogOut size={16} strokeWidth={1.8} />
            Log out
          </button>
        </div>
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
            {/* On a phone the wordmark told the user nothing they did not
                already know; their own name and role is worth the line. */}
            <span className="mobile-app-label">
              {currentRole?.name?.split(' (')[0] || 'twif OMS'}
              {accountTypeByRole[role]?.short ? <em> · {accountTypeByRole[role].short}</em> : null}
            </span>
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
            {role === 'tailor' && activeView === 'My Log' ? <p className="topbar-subtitle">Your completed work, over any period you choose.</p> : null}
            {role === 'store_manager' && activeView === 'Overview' ? <p className="topbar-subtitle">Good morning, {currentRole?.name?.split(' (')[0] || 'Store Manager'}. Welcome to the store!</p> : null}
            {role === 'store_manager' && activeView === 'Customers' ? <p className="topbar-subtitle">Manage customer profiles and create new orders.</p> : null}
          </div>
          <div className="topbar-actions">
            {/* Identity sits at the foot of the sidebar with the account
                actions; the bell is the only thing left up here. */}
            <NotificationBell role={role} currentRole={currentRole} onOpen={() => openView('Notifications')} />
          </div>
        </header>

        <Routes>
          {(visibleNav || []).map((view) => (
            <Route
              key={view}
              path={`/${roleSlug(role)}/${viewSlug(view)}/*`}
              element={renderView(view, role, {
                currentRole,
                onNavigate: openView,
                onInvoiceSent: recordSentInvoice,
                onApproveInvoice: updateInvoiceApproval,
                onInvoiceUpdated: applyInvoiceUpdate,
                onInvoiceDeleted: (invoiceNumber) => {
                  setSentInvoices((current) => current.filter((item) => item.invoiceNumber !== invoiceNumber));
                  setProductionJobs((current) => current.filter((job) => job.invoiceNumber !== invoiceNumber));
                },
                sentInvoices,
                productionJobs: approvedProductionJobs,
                blockedProductionJobs,
                onCreateJob: createProductionJob,
                onUpdateJob: updateProductionJob,
                onOverrideHold: overrideProductionHold,
              })}
            />
          ))}
          <Route path="*" element={<Navigate to={`/${roleSlug(role)}/${viewSlug(visibleNav?.[0] || 'Overview')}`} replace />} />
        </Routes>
      </main>
      {/* A role with few enough views shows them all, so More is dropped —
          for a Tailor it opened a drawer holding nothing new. */}
      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
        style={{ gridTemplateColumns: `repeat(${Math.min(visibleNav.length, 5)}, minmax(0, 1fr))` }}
      >
        {visibleNav.slice(0, visibleNav.length > 5 ? 4 : 5).map((item) => {
          const IconComp = NAV_ICONS[item];
          return (
            <NavLink key={item} to={`/${roleSlug(role)}/${viewSlug(item)}`} onClick={() => setMobileMenuOpen(false)}>
              {IconComp ? <IconComp size={21} strokeWidth={1.7} /> : <LayoutDashboard size={21} strokeWidth={1.7} />}
              <span>{item.length > 12 ? item.split(' ')[0] : item}</span>
            </NavLink>
          );
        })}
        {visibleNav.length > 5 ? (
          <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open all navigation">
            <MoreHorizontal size={21} strokeWidth={1.7} /><span>More</span>
          </button>
        ) : null}
      </nav>
    </div>
  );
}

export default App;
