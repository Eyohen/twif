import { money, invoiceApprovalStatus } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

export default function CustomerProfilePage({ customer, sentInvoices = [], onBack, onEdit }) {
  const invoices = sentInvoices.filter((invoice) => invoice.customer === customer.fullName);
  const measurements = customer.measurements || {};
  const measurementRows = [
    ['Height', measurements.height || '178 cm'], ['Chest', measurements.chest || '42 in'],
    ['Waist', measurements.waist || '34 in'], ['Hip', measurements.hip || '41 in'],
    ['Shoulder', measurements.shoulder || '18 in'], ['Sleeve', measurements.sleeve || '24 in'],
    ['Neck', measurements.neck || '16 in'], ['Trouser', measurements.trouser || '31 in'],
  ];

  return (
    <div className="customer-profile-page">
      <div className="customer-profile-toolbar"><button type="button" onClick={onBack}>← &nbsp; Back to Customers</button><div><button>▢ &nbsp; Send Message</button><button className="new-order">＋ &nbsp; New Order &nbsp;⌄</button></div></div>
      <section className="customer-profile-hero">
        <div className="customer-profile-person"><i>{customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span><div><h2>{customer.fullName}</h2><b>{Number(customer.totalOrders) > 1 ? 'Returning Customer' : 'New Customer'}</b></div><p>⌕ &nbsp; {customer.phone || '—'} &nbsp;&nbsp;&nbsp; ▣ &nbsp; {customer.email || '—'} &nbsp;&nbsp;&nbsp; ◉ &nbsp; {customer.stores?.[0] || 'Lekki'} Store</p><small>Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2025'}</small></span></div>
        <dl><div><dt>Total Orders</dt><dd>{customer.totalOrders || invoices.length}</dd><small>View all orders</small></div><div><dt>Last Visit</dt><dd>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</dd><small>Recently</small></div><div><dt>Store Credit</dt><dd>{money.format(customer.storeCreditBalance || 0)}</dd><small>View details</small></div><div><dt>Preferred Store</dt><dd>{customer.stores?.[0] || 'Lekki'}</dd><small>Primary</small></div></dl>
      </section>
      <nav className="customer-profile-tabs">{['♙  Overview', '⌁  Measurements', '▣  Orders', '▤  Invoices', '◷  Timeline', '▢  Notes'].map((tab, index) => <button className={index === 0 ? 'active' : ''} key={tab}>{tab}</button>)}</nav>
      <section className="customer-profile-grid">
        <div className="customer-profile-main">
          <article className="customer-profile-panel customer-summary"><header><h3>♙ &nbsp; Customer Summary</h3><button type="button" onClick={onEdit}>Edit Customer</button></header><div><dl><dt>Full Name</dt><dd>{customer.fullName}</dd><dt>Phone Number</dt><dd>{customer.phone || '—'} &nbsp;◉</dd><dt>Email Address</dt><dd>{customer.email || '—'}</dd><dt>Date of Birth</dt><dd>{customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString('en-GB') : '12 Mar 1988'}</dd><dt>Gender</dt><dd>{customer.gender || 'Not specified'}</dd><dt>Occupation</dt><dd>{customer.occupation || '—'}</dd><dt>Address</dt><dd>{customer.address || '—'}</dd><dt>Preferred Contact</dt><dd>{customer.communicationPreference || 'WhatsApp'}</dd></dl><dl><dt>Customer ID</dt><dd>{customer.customerNumber || `CUST-${String(customer.id).slice(-6)}`}</dd><dt>Customer Type</dt><dd>{Number(customer.totalOrders) > 1 ? 'Returning' : 'New'}</dd><dt>Registration Date</dt><dd>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : '—'}</dd><dt>Referred By</dt><dd>{customer.referredBy || 'Walk-in'}</dd><dt>Preferred Store</dt><dd>{customer.stores?.[0] || 'Lekki'} Store</dd><dt>Communication Preference</dt><dd>{customer.communicationPreference || 'WhatsApp'}</dd><dt>Special Notes</dt><dd>{customer.notes || 'No special notes.'}</dd></dl></div></article>
          <article className="customer-profile-panel customer-recent-orders"><header><h3>☷ &nbsp; Recent Orders</h3><button>View all orders</button></header><div>{invoices.slice(0, 4).map((invoice) => <section key={invoice.invoiceNumber}><header><span>{invoice.invoiceNumber}</span><Status>{invoice.orderSheet?.status || invoice.orderStatus}</Status></header><strong>{invoice.item}</strong><small>{invoice.pieces || 1} Pieces</small><p>▣ &nbsp; Delivery: {invoice.deliveryDate ? new Date(invoice.deliveryDate).toLocaleDateString('en-GB') : 'Not set'}</p><footer>Total: <b>{money.format(invoice.total)}</b><span>›</span></footer></section>)}{!invoices.length ? <p className="store-overview-empty">No recent orders for this customer.</p> : null}</div></article>
        </div>
        <aside className="customer-profile-side">
          <article className="customer-profile-panel profile-measurements"><header><h3>▣ &nbsp; Measurements <b>{customer.measurementsAdded ? 'Saved' : 'Not saved'}</b></h3><button>View All</button></header><p>Last updated: {customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('en-GB') : 'Recently'} by Store Manager</p><div>{measurementRows.map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</div></article>
          <article className="customer-profile-panel customer-notes"><header><h3>▤ &nbsp; Customer Notes</h3><button>Edit</button></header><ul><li>Likes slim fit and minimal designs</li><li>Prefers dark colors</li><li>Usually needs outfits before weekends</li><li>Sensitive to wool fabrics</li></ul></article>
          <article className="customer-profile-panel customer-timeline"><header><h3>◷ &nbsp; Activity Timeline</h3><button>View full timeline</button></header><div>{invoices.slice(0, 4).map((invoice, index) => <section key={invoice.invoiceNumber}><i className={`timeline-${index}`}>{['▤', '▣', '♙', '▱'][index]}</i><span><small>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('en-GB') : 'Recently'}</small><strong>{index === 0 ? `Invoice ${invoice.invoiceNumber} was created` : index === 1 ? 'Payment confirmed by Accounts' : index === 2 ? 'Production started' : invoiceApprovalStatus(invoice)}</strong><p>{index === 0 ? 'By Store Manager' : 'Customer activity updated'}</p></span></section>)}</div></article>
        </aside>
      </section>
    </div>
  );
}
