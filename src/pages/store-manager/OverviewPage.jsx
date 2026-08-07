import { useEffect, useState } from 'react';
import { Users, FileText, Package, Bell, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { invoiceApprovalStatus, isFullyPaid } from '../../utils/oms';
import { api } from '../../lib/api';

const ACTIVITY_LABELS = ['Invoice Sent', 'Measurement', 'Ready', 'Payment'];
const ACTIVITY_TIMES = ['10:30 AM', '11:45 AM', '1:15 PM', '2:20 PM'];
const ACTIVITY_NOTES = ['Invoice sent to customer', 'Measurement completed', 'Ready for collection', 'Payment received'];

export default function StoreManagerOverviewPage({ sentInvoices = [], productionJobs = [], onNavigate }) {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.get('/oms/customers')
      .then((response) => { if (!cancelled) setCustomers(response.data?.data?.customers || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const today = new Set(sentInvoices.map((invoice) => invoice.customer)).size;
  const awaitingPayment = sentInvoices.filter((invoice) => !isFullyPaid(invoice));
  const readyJobs = productionJobs.filter((job) => ['Ready', 'Ready for Collection'].includes(job.status));
  const pendingApproval = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts');
  // Counted against the customer register, since this tile links there.
  const customersWithoutMeasurements = customers.filter((customer) => !customer.measurementsAdded).length;
  const activities = sentInvoices.slice(0, 4);
  const collections = productionJobs.filter((job) => job.delivery).slice(0, 9);
  const collectionGroups = [collections.slice(0, 3), collections.slice(3, 7), collections.slice(7, 9)];

  const kpis = [
    { Icon: FileText, label: 'Orders Today', value: sentInvoices.length, detail: '+2 from yesterday', tone: 'blue', dest: 'Orders' },
    { Icon: TrendingUp, label: 'Awaiting Payment', value: awaitingPayment.length, detail: 'View and follow up', tone: 'gold', dest: 'Invoices', params: { status: 'AwaitingPayment' } },
    { Icon: Package, label: 'Ready for Pickup', value: readyJobs.length, detail: 'View collections', tone: 'green', dest: 'Invoices' },
    { Icon: Users, label: 'Customers Today', value: today, detail: '+3 new customers', tone: 'purple', dest: 'Customers' },
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
          <h2>Today&apos;s Activity</h2>
          <div>
            {activities.map((invoice, index) => (
              <section
                key={invoice.invoiceNumber}
                style={{ cursor: onNavigate ? 'pointer' : 'default' }}
                onClick={() => onNavigate?.('Invoices', { invoice: invoice.invoiceNumber })}
              >
                <i>{invoice.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i>
                <span>
                  <small>{invoice.invoiceNumber}</small>
                  <strong>{invoice.customer}</strong>
                  <p>{ACTIVITY_NOTES[index]}</p>
                </span>
                <time>{ACTIVITY_TIMES[index]}</time>
                <b className={`activity-${index}`}>{ACTIVITY_LABELS[index]}</b>
              </section>
            ))}
            {!activities.length ? <p className="store-overview-empty">Store activity will appear here.</p> : null}
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
            {collectionGroups.map((jobs, index) => (
              <section key={index}>
                <header>
                  <strong>{index === 0 ? 'Tomorrow' : index === 1 ? 'Friday, 25 Jul' : 'Saturday, 26 Jul'}</strong>
                  <i><Package size={14} strokeWidth={1.8} /></i>
                </header>
                <b>{jobs.length} orders</b>
                <p>{jobs.map((job) => job.invoiceNumber).join(', ') || 'No scheduled orders'}</p>
              </section>
            ))}
          </div>
          <button type="button" onClick={() => onNavigate?.('Orders')}>View all collections &nbsp;›</button>
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
