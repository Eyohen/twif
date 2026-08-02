import { invoiceApprovalStatus } from '../../utils/oms';

export default function StoreManagerOverviewPage({ sentInvoices = [], productionJobs = [] }) {
  const awaitingPayment = sentInvoices.filter((invoice) => invoice.paymentStatus !== 'Fully Paid');
  const readyJobs = productionJobs.filter((job) => job.status === 'Ready');
  const pendingApproval = sentInvoices.filter((invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts');
  const missingMeasurements = productionJobs.filter((job) => !job.measurements);
  const activities = sentInvoices.slice(0, 4);
  const deliveries = productionJobs.filter((job) => job.delivery).slice(0, 9);
  const deliveryGroups = [deliveries.slice(0, 3), deliveries.slice(3, 7), deliveries.slice(7, 9)];

  return (
    <div className="store-overview">
      <section className="store-overview-kpis">
        {[
          ['▤', 'Orders Today', sentInvoices.length, '+2 from yesterday', 'blue'],
          ['▣', 'Awaiting Payment', awaitingPayment.length, 'View and follow up', 'gold'],
          ['▱', 'Ready for Pickup', readyJobs.length, 'View deliveries', 'green'],
          ['▤', 'Customers Today', new Set(sentInvoices.map((invoice) => invoice.customer)).size, '+3 new customers', 'purple'],
        ].map(([icon, label, value, detail, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong><b>{detail}</b></span></article>)}
      </section>

      <section className="store-overview-main-grid">
        <article className="store-overview-panel todays-activity"><h2>Today&apos;s Activity</h2><div>
          {activities.map((invoice, index) => <section key={invoice.invoiceNumber}><i>{invoice.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span><small>{invoice.invoiceNumber}</small><strong>{invoice.customer}</strong><p>{index === 0 ? 'Invoice sent to customer' : index === 1 ? 'Measurement completed' : index === 2 ? 'Ready for pickup' : 'Payment received'}</p></span><time>{['10:30 AM', '11:45 AM', '1:15 PM', '2:20 PM'][index]}</time><b className={`activity-${index}`}>{['Invoice Sent', 'Measurement', 'Ready', 'Payment'][index]}</b></section>)}
          {!activities.length ? <p className="store-overview-empty">Store activity will appear here.</p> : null}
        </div><button>View all activity &nbsp;›</button></article>

        <article className="store-overview-panel pending-actions"><h2>Pending Actions</h2><div>{[
          ['♙', 'Awaiting Measurements', `${missingMeasurements.length} customers`, 'orange'],
          ['▣', 'Awaiting Payment', `${awaitingPayment.length} invoices`, 'gold'],
          ['▤', 'Waiting for Accounts Approval', `${pendingApproval.length} invoices`, 'purple'],
          ['◯', 'Production Questions', `${productionJobs.filter((job) => job.productionNote).length} orders`, 'blue'],
        ].map(([icon, label, detail, tone]) => <section key={label}><i className={tone}>{icon}</i><span><strong>{label}</strong><small>{detail}</small></span><b>›</b></section>)}</div><button>View all pending &nbsp;›</button></article>
      </section>

      <section className="store-overview-bottom-grid">
        <article className="store-overview-panel upcoming-deliveries"><header><h2>▣ &nbsp; Upcoming Deliveries</h2><button>View calendar</button></header><div>{deliveryGroups.map((jobs, index) => <section key={index}><header><strong>{index === 0 ? 'Tomorrow' : index === 1 ? 'Friday, 25 Jul' : 'Saturday, 26 Jul'}</strong><i>{['▣', '▣', '▣'][index]}</i></header><b>{jobs.length} orders</b><p>{jobs.map((job) => job.invoiceNumber).join(', ') || 'No scheduled orders'}</p></section>)}</div><button>View all deliveries &nbsp;›</button></article>
        <article className="store-overview-panel recent-store-notifications"><header><h2>Recent Notifications</h2><button>View all</button></header><div>{[
          ['✓', `Payment confirmed for ${activities[0]?.invoiceNumber || 'invoice'} – ${activities[0]?.customer || 'Customer'}`, '2:20 PM', 'green'],
          ['▤', `${activities[1]?.invoiceNumber || 'Invoice'} has been approved by Accounts`, '11:30 AM', 'blue'],
          ['♧', `Order sheet for ${activities[2]?.invoiceNumber || 'invoice'} is now in production`, '10:15 AM', 'gold'],
        ].map(([icon, text, time, tone]) => <section key={text}><i className={tone}>{icon}</i><span><strong>{text}</strong><small>{time}</small></span></section>)}</div></article>
      </section>
    </div>
  );
}
