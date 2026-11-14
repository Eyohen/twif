import { useEffect, useState } from 'react';
import { Users, FileText, Package, Bell, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { invoiceApprovalStatus, isFullyPaid, filterByPeriod, addDaysIso, todayIso, money, toNumber } from '../../utils/oms';
import { api } from '../../lib/api';
import PeriodFilter, { initialCustomRange } from '../../components/oms/PeriodFilter';

const PERIOD_NAMES = { today: 'Today', yesterday: 'Yesterday', week: 'This Week', month: 'This Month', custom: 'In Range' };
const READY_STATES = ['Ready', 'Ready for Collection'];
const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

export default function StoreManagerOverviewPage({ sentInvoices = [], productionJobs = [], onNavigate }) {
  const [customers, setCustomers] = useState([]);
  // The tiles used to count every invoice ever sent under "Orders Today". They
  // read over the period picked here, and open on Today.
  const [period, setPeriod] = useState('today');
  const [range, setRange] = useState(initialCustomRange);

  useEffect(() => {
    let cancelled = false;
    api.get('/oms/customers')
      .then((response) => { if (!cancelled) setCustomers(response.data?.data?.customers || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const periodInvoices = filterByPeriod(sentInvoices, (invoice) => invoice.createdAt, period, range.from, range.to);
  const periodName = PERIOD_NAMES[period] || 'Today';
  const periodCustomers = new Set(periodInvoices.map((invoice) => invoice.customer)).size;
  const periodValue = periodInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const awaitingPayment = sentInvoices.filter((invoice) => !isFullyPaid(invoice));
  const readyJobs = productionJobs.filter((job) => READY_STATES.includes(job.status));
  const pendingApproval = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts');
  // Counted against the customer register, since this tile links there.
  const customersWithoutMeasurements = customers.filter((customer) => !customer.measurementsAdded).length;
  const activities = [...periodInvoices]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 4);

  // Orders that are ready, set against the day the customer is due to collect
  // them. These used to be the first nine jobs with a delivery date, whatever
  // their state, split into three fixed groups under invented dates.
  const todayKey = todayIso();
  const tomorrowKey = addDaysIso(todayKey, 1);
  const deliveryDay = (job) => String(job.delivery || '').slice(0, 10);
  const readyWithDate = readyJobs.filter((job) => deliveryDay(job));
  const collectionGroups = [
    { title: 'Today & overdue', note: 'Due now or already past', jobs: readyWithDate.filter((job) => deliveryDay(job) <= todayKey) },
    { title: `Tomorrow`, note: dayLabel(tomorrowKey), jobs: readyWithDate.filter((job) => deliveryDay(job) === tomorrowKey) },
    { title: 'Later', note: 'Due after tomorrow', jobs: readyWithDate.filter((job) => deliveryDay(job) > tomorrowKey) },
  ];
  const readyWithoutDate = readyJobs.length - readyWithDate.length;

  const kpis = [
    { Icon: FileText, label: `Orders ${periodName}`, value: periodInvoices.length, detail: money.format(periodValue), tone: 'blue', dest: 'Orders' },
    { Icon: TrendingUp, label: 'Awaiting Payment', value: awaitingPayment.length, detail: 'View and follow up', tone: 'gold', dest: 'Invoices', params: { status: 'AwaitingPayment' } },
    { Icon: Package, label: 'Ready for Pickup', value: readyJobs.length, detail: 'View collections', tone: 'green', dest: 'Orders', params: { filter: 'Ready for Collection' } },
    { Icon: Users, label: `Customers ${periodName}`, value: periodCustomers, detail: 'Customers with an order', tone: 'purple', dest: 'Customers' },
  ];

  const pendingItems = [
    { Icon: AlertCircle, label: 'Awaiting Measurements', detail: `${customersWithoutMeasurements} customers`, tone: 'orange', dest: 'Customers', params: { filter: 'No Measurements' } },
    { Icon: TrendingUp, label: 'Awaiting Payment', detail: `${awaitingPayment.length} invoices`, tone: 'gold', dest: 'Invoices', params: { status: 'AwaitingPayment' } },
    { Icon: FileText, label: 'Waiting for Accounts Approval', detail: `${pendingApproval.length} invoices`, tone: 'purple', dest: 'Invoices', params: { status: 'Pending' } },
    { Icon: Clock, label: 'Production Questions', detail: `${productionJobs.filter((job) => job.productionNote).length} orders`, tone: 'blue', dest: 'Orders' },
  ];

  const notificationItems = [
    { Icon: CheckCircle, text: `Payment confirmed for ${activities[0]?.invoiceNumber || 'invoice'} – ${activities[0]?.customer || 'Customer'}`, time: '2:20 PM', tone: 'green' },
    { Icon: FileText, text: `${activities[1]?.invoiceNumber || 'Invoice'} has been approved by Accounts`, time: '11:30 AM', tone: 'blue' },
    { Icon: Package, text: `Order sheet for ${activities[2]?.invoiceNumber || 'invoice'} is now in production`, time: '10:15 AM', tone: 'gold' },
  ];

  return (
    <div className="store-overview">

      <PeriodFilter period={period} onPeriod={setPeriod} from={range.from} to={range.to} onFrom={(from) => setRange((current) => ({ ...current, from }))} onTo={(to) => setRange((current) => ({ ...current, to }))} />

      <section className="store-overview-kpis">
        {kpis.map(({ Icon, label, value, detail, tone, dest, params }) => (
          <article
            className={tone}
            key={label}
            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
            onClick={() => onNavigate?.(dest, params)}
          >
            <i><Icon size={22} strokeWidth={1.8} /></i>
            <span><small>{label}</small><strong>{value}</strong><b>{detail}</b></span>
          </article>
        ))}
      </section>

      <section className="store-overview-main-grid">
        <article className="store-overview-panel todays-activity">
          <h2>{period === 'today' ? 'Today\u2019s Activity' : `Activity \u00b7 ${periodName}`}</h2>
          <div>
            {activities.map((invoice) => (
              <section
                key={invoice.invoiceNumber}
                style={{ cursor: onNavigate ? 'pointer' : 'default' }}
                onClick={() => onNavigate?.('Invoices', { invoice: invoice.invoiceNumber })}
              >
                <i>{invoice.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i>
                <span>
                  <small>{invoice.invoiceNumber}</small>
                  <strong>{invoice.customer}</strong>
                  <p>{invoice.paymentStatus || 'Invoice sent to customer'}</p>
                </span>
                <time>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</time>
                <b className="activity-0">Invoice Sent</b>
              </section>
            ))}
            {!activities.length ? <p className="store-overview-empty">No invoices for this period yet.</p> : null}
          </div>
        </article>

        <article className="store-overview-panel pending-actions">
          <h2>Pending Actions</h2>
          <div>
            {pendingItems.map(({ Icon, label, detail, tone, dest, params }) => (
              <section
                key={label}
                style={{ cursor: onNavigate ? 'pointer' : 'default' }}
                onClick={() => onNavigate?.(dest, params)}
              >
                <i className={tone}><Icon size={20} strokeWidth={1.8} /></i>
                <span><strong>{label}</strong><small>{detail}</small></span>
                <b className="pending-chevron">›</b>
              </section>
            ))}
          </div>
        </article>
      </section>

      <section className="store-overview-bottom-grid">
        <article className="store-overview-panel upcoming-deliveries">
          <header>
            <h2><Package size={16} strokeWidth={1.8} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 7 }} />Ready for Collection</h2>
          </header>
          <div>
            {collectionGroups.map(({ title, note, jobs }) => (
              <section key={title}>
                <header>
                  <strong>{title}</strong>
                  <i><Package size={14} strokeWidth={1.8} /></i>
                </header>
                <b>{jobs.length} order{jobs.length === 1 ? '' : 's'}</b>
                <p>{jobs.map((job) => job.invoiceNumber).join(', ') || note}</p>
              </section>
            ))}
            {readyWithoutDate ? <p className="store-overview-empty">{readyWithoutDate} ready order{readyWithoutDate === 1 ? ' has' : 's have'} no delivery date set.</p> : null}
          </div>
          <button type="button" onClick={() => onNavigate?.('Orders', { filter: 'Ready for Collection' })}>View all collections &nbsp;›</button>
        </article>

        <article className="store-overview-panel recent-store-notifications">
          <header>
            <h2>
              <Bell size={15} strokeWidth={1.8} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 7 }} />
              Recent Notifications
            </h2>
            <button type="button" onClick={() => onNavigate?.('Notifications')}>View all</button>
          </header>
          <div>
            {notificationItems.map(({ Icon, text, time, tone }) => (
              <section key={text}>
                <i className={tone}><Icon size={17} strokeWidth={1.8} /></i>
                <span><strong>{text}</strong><small>{time}</small></span>
              </section>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
