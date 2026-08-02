import { money } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const formatDate = (value, fallback = '22 Jul 2026') => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : fallback;

export default function OrderDetailsPage({ order, onBack }) {
  const job = order.orderSheet || {};
  const status = order.approval === 'Pending Accounts' ? 'Pending Accounts' : job.status === 'Ready' ? 'Ready for Collection' : job.status || order.orderStatus || 'In Production';
  const total = Number(order.total || 0);
  const paid = Number(order.paid || order.amountPaid || 0);
  const balance = Math.max(0, total - paid);
  const items = [
    ['Navy Senator', 'Top', Math.round(total * .337)],
    ['Grey Trousers', 'Bottom', Math.round(total * .308)],
    ['White Shirt', 'Top', total - Math.round(total * .337) - Math.round(total * .308)],
  ];

  return <div className="order-details-page">
    <header className="order-details-heading">
      <div><p><button type="button" onClick={onBack}>Orders</button> &nbsp;›&nbsp; <strong>Order Details</strong></p><h2>Order Details <Status>{status}</Status></h2><span>View full details and track the progress of this order.</span></div>
      <div><button>▣ &nbsp; Print Invoice</button><button>✉ &nbsp; Resend Invoice</button><button>⋮ &nbsp; More Actions &nbsp;⌄</button></div>
    </header>
    <section className="order-details-facts">
      <dl><div><dt>Invoice No.</dt><dd>{order.invoiceNumber}</dd><small>Created on {formatDate(order.createdAt)}</small></div><div><dt>Customer</dt><dd className="order-detail-customer"><i>{order.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span>{order.customer}<small>{order.phone || job.phone || '0813 813 7841'}</small></span></dd><small className="link">View Customer &nbsp;›</small></div><div><dt>Delivery Date</dt><dd>{formatDate(job.delivery || order.deliveryDate, '26 Jul 2026')}</dd><small className="danger">4 days left</small></div><div><dt>Production Status</dt><dd><Status>{status}</Status></dd><small>With Production</small></div><div><dt>Payment Status</dt><dd><Status>{order.paymentStatus || 'Partial Paid'}</Status></dd><small>{money.format(paid)} paid of {money.format(total)}</small></div><div><dt>Invoice Total</dt><dd>{money.format(total)}</dd></div></dl>
    </section>
    <nav className="order-details-tabs">{['Order Overview', `Items (${order.pieces || job.pieces || 3})`, 'Measurements', 'Production Timeline', 'Notes & Activity', 'Documents'].map((tab, index) => <button className={index === 0 ? 'active' : ''} key={tab}>{tab}</button>)}</nav>
    <section className="order-details-grid">
      <div className="order-detail-left">
        <article className="order-detail-card order-summary-card"><h3>Order Summary</h3><dl><dt>Order Type</dt><dd>Stitching</dd><dt>Items</dt><dd>{order.pieces || job.pieces || 3} pieces</dd><dt>Delivery Type</dt><dd>Store Pickup</dd><dt>Delivery Address</dt><dd>{order.store || 'Lekki Store'}</dd><dt>Special Instructions</dt><dd>{job.productionNote || 'Prefers slim fit and dark colors.'}</dd></dl><hr/><h3>Payment Summary</h3><dl><dt>Invoice Total</dt><dd>{money.format(total)}</dd><dt>Amount Paid</dt><dd>{money.format(paid)}</dd><dt>Balance Remaining</dt><dd className="danger">{money.format(balance)}</dd></dl><header><strong>Payment History</strong><button>View All Payments</button></header><section><b>22 Jul 2026</b><span>Bank Transfer<small>{order.customer}</small></span><strong>{money.format(paid)}</strong></section></article>
        <article className="order-detail-card order-customer-notes"><h3>Customer Notes</h3><p>Prefers slim fit. Likes simple designs.</p><small>Added on 22 Jul 2026 by Bola</small><button>Edit</button></article>
      </div>
      <article className="order-detail-card production-progress-card"><h3>Production Progress</h3><div className="production-steps">{[
        ['Order Created', 'Invoice created and sent to Accounts', '22 Jul 2026', '10:15 AM', 'done'],
        ['Accounts Confirmed', 'Payment confirmed and order approved', '22 Jul 2026', '11:42 AM', 'done'],
        ['In Production', 'Order is being worked on', '23 Jul 2026', '09:30 AM', 'current'],
        ['Ready for Collection', 'Awaiting quality check and notification', '', '', 'pending'],
        ['Completed', 'Order collected by customer', '', '', 'pending'],
      ].map(([label, note, date, time, state]) => <section className={state} key={label}><i>{state === 'done' ? '✓' : ''}</i><span><strong>{label}</strong><small>{note}</small></span><time>{date}<small>{time}</small></time></section>)}</div><footer>ⓘ &nbsp; You will be notified when this order is ready for collection.</footer></article>
      <div className="order-detail-right">
        <article className="order-detail-card order-items-card"><header><h3>Items in this Order</h3><button>View Items</button></header>{items.map(([name, type, value], index) => <section key={name}><i className={`item-${index}`}>♟</i><span><strong>{name}</strong><small>{type}<br/>1 piece</small></span><b>{money.format(value)}</b></section>)}<footer><strong>Total ({items.length} items)</strong><b>{money.format(total)}</b></footer></article>
        <article className="order-detail-card order-activity-card"><header><h3>Activity</h3><button>View All</button></header>{[['23 Jul 2026, 09:30 AM', 'Bola marked order as In Production'], ['22 Jul 2026, 11:42 AM', 'Payment confirmed by Accounts'], ['22 Jul 2026, 10:15 AM', 'Invoice created by Bola']].map(([date, text], index) => <section key={text}><i className={`activity-${index}`}/><span><small>{date}</small><p>{text}</p></span></section>)}</article>
      </div>
    </section>
    <footer className="order-details-actions"><button onClick={onBack}>← &nbsp; Back to Orders</button><div><button>◉ &nbsp; Contact Customer</button><button>▱ &nbsp; Mark as Ready for Collection</button></div></footer>
  </div>;
}
