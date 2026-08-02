import { useMemo, useState } from 'react';
import { money } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const sampleOrders = [
  ['INV30659', 'Green Senator', 'Top & Bottom', 2, 'In Production', '22 Jul 2026', '26 Jul 2026', 85000],
  ['INV30512', 'White Agbada', '3 Piece', 3, 'Ready for Collection', '10 Jul 2026', '16 Jul 2026', 120000],
  ['INV30311', 'Black Tuxedo', '2 Piece', 2, 'Completed', '20 Jun 2026', '28 Jun 2026', 95000],
  ['INV29980', 'Navy Native', 'Top & Bottom', 2, 'Completed', '25 May 2026', '02 Jun 2026', 55000],
  ['INV29421', 'Grey Kaftan', 'Top & Bottom', 2, 'Completed', '01 May 2026', '08 May 2026', 20000],
  ['INV28933', 'Casual Wear', 'Shirt', 1, 'Cancelled', '15 Apr 2026', '—', 10000],
].map(([invoiceNumber, item, description, pieces, status, orderDate, deliveryDate, total], index) => ({
  invoiceNumber, item, description, pieces, status, orderDate, deliveryDate, total, orderNumber: 1256 - index * 43,
}));

function normalizeOrder(invoice, index) {
  const status = invoice.orderSheet?.status || invoice.orderStatus || 'In Production';
  return {
    ...invoice,
    description: invoice.description || `${invoice.pieces || 1} Piece`,
    orderDate: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    deliveryDate: invoice.deliveryDate ? new Date(invoice.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    orderNumber: 1256 - index * 15,
    status,
  };
}

export default function CustomerOrdersPage({ customer, sentInvoices = [], onBack }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Orders');
  const customerInvoices = sentInvoices.filter((invoice) => invoice.customer === customer.fullName);
  const orders = (customerInvoices.length ? customerInvoices.map(normalizeOrder) : sampleOrders);
  const filtered = useMemo(() => orders.filter((order) => {
    const matchesSearch = `${order.invoiceNumber} ${order.item} ${order.status}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All Orders'
      || (filter === 'Active' && !['Completed', 'Cancelled'].includes(order.status))
      || order.status === filter;
    return matchesSearch && matchesFilter;
  }), [orders, search, filter]);
  const completed = orders.filter((order) => order.status === 'Completed').length;
  const active = orders.filter((order) => !['Completed', 'Cancelled'].includes(order.status)).length;
  const totalSpent = orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + Number(order.total || 0), 0);
  const initials = customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return <div className="customer-orders-page">
    <header className="customer-orders-heading">
      <p><button type="button" onClick={onBack}>Customers</button> &nbsp;›&nbsp; {customer.fullName} &nbsp;›&nbsp; <strong>Orders</strong></p>
      <h2>Orders</h2><span>View all orders placed by {customer.fullName}.</span>
    </header>
    <section className="customer-orders-hero">
      <div className="customer-orders-person"><i>{initials}</i><span><div><h3>{customer.fullName}</h3><b>{Number(customer.totalOrders) > 1 ? 'Returning Customer' : 'New Customer'}</b></div><p>⌕ &nbsp; {customer.phone || '—'} &nbsp;&nbsp;&nbsp; ▣ &nbsp; {customer.email || '—'} &nbsp;&nbsp;&nbsp; ◉ &nbsp; {customer.stores?.[0] || 'Lekki'} Store</p><small>Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2025'}</small></span></div>
      <dl><div><dt>Total Orders</dt><dd>{orders.length}</dd><small>View all orders</small></div><div><dt>Active Orders</dt><dd>{active}</dd><small>View active</small></div><div><dt>Completed Orders</dt><dd>{completed}</dd></div><div><dt>Total Spent</dt><dd>{money.format(totalSpent)}</dd><small>View summary</small></div></dl>
    </section>
    <section className="customer-orders-register">
      <header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by invoice number, item, status..." /></label><div>▣ &nbsp; From date &nbsp;&nbsp; → &nbsp;&nbsp; To date &nbsp; ▣</div><button>▽ &nbsp; Filters &nbsp;⌄</button></header>
      <nav><div>{['All Orders', 'Active', 'In Production', 'Ready for Collection', 'Completed', 'Cancelled'].map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><select><option>Sort by: Newest First</option><option>Oldest First</option></select></nav>
      <div className="customer-orders-layout">
        <div className="customer-orders-table"><table><thead><tr><th>Invoice No.</th><th>Item / Description</th><th>Pieces</th><th>Status</th><th>Order Date</th><th>Delivery Date</th><th>Total</th><th>Actions</th></tr></thead><tbody>{filtered.map((order, index) => <tr key={order.invoiceNumber}><td><div className={`order-garment garment-${index % 5}`}>♟</div><span><strong>{order.invoiceNumber}</strong><small>Order #{order.orderNumber}</small></span></td><td><strong>{order.item || 'Custom Outfit'}</strong><small>{order.description}</small></td><td>{order.pieces || 1}</td><td><Status>{order.status}</Status><small>{order.status === 'In Production' ? 'With Production' : order.status === 'Ready for Collection' ? 'Ready' : order.status === 'Completed' ? 'Collected' : 'Cancelled'}</small></td><td>{order.orderDate}</td><td>{order.deliveryDate}<small className={order.status === 'In Production' ? 'late' : ''}>{order.status === 'In Production' ? '4 days left' : order.status === 'Completed' ? 'Collected' : ''}</small></td><td>{money.format(order.total)}</td><td><button>View Details</button><button className="dots">⋮</button></td></tr>)}</tbody></table>{!filtered.length && <div className="accounts-empty">No orders match this view.</div>}</div>
        <aside className="customer-order-summary">
          <article><h3>Order Summary</h3><div className="order-summary-chart"><i><b>{orders.length}</b></i><ul><li><em className="green"/>In Production <b>{active}</b></li><li><em className="blue"/>Ready for Collection <b>{orders.filter((o) => o.status === 'Ready for Collection').length}</b></li><li><em className="mint"/>Completed <b>{completed}</b></li><li><em/>Cancelled <b>{orders.filter((o) => o.status === 'Cancelled').length}</b></li></ul></div><dl><dt>Total Orders</dt><dd>{orders.length}</dd><dt>Total Spent</dt><dd>{money.format(totalSpent)}</dd><dt>Average Order Value</dt><dd>{money.format(orders.length ? totalSpent / orders.length : 0)}</dd></dl></article>
          <article><h3>Most Ordered Items</h3><ol>{orders.slice(0, 5).map((order, index) => <li key={order.invoiceNumber}><i>{index + 1}</i><strong>{order.item}</strong><span>{index ? '1 order' : `${Math.max(1, orders.length - 3)} orders`}</span></li>)}</ol><button>View All Items</button></article>
        </aside>
      </div>
      <footer>Showing {filtered.length ? 1 : 0} to {filtered.length} of {orders.length} orders</footer>
    </section>
  </div>;
}
