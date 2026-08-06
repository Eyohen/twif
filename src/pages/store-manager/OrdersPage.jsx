import { useMemo, useState } from 'react';
import { money, invoiceApprovalStatus } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import OrderDetailsPage from './OrderDetailsPage';

export default function StoreManagerOrdersPage({ sentInvoices = [] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const orders = sentInvoices.map((invoice) => ({ ...invoice, job: invoice.orderSheet || {}, approval: invoiceApprovalStatus(invoice) }));
  const matchesFilter = (order) => filter === 'All'
    || (filter === 'Unpaid' && !['Fully Paid', 'Paid'].includes(order.paymentStatus))
    || (filter === 'Partial Paid' && order.paymentStatus === 'Partial Paid')
    || (filter === 'Paid' && ['Fully Paid', 'Paid'].includes(order.paymentStatus))
    || (filter === 'Pending Accounts' && order.approval === 'Pending Accounts')
    || (filter === 'In Production' && ['Assigned', 'In Progress'].includes(order.job.status))
    || (filter === 'Ready for Collection' && ['Ready', 'Ready for Collection'].includes(order.job.status))
    || (filter === 'Completed' && order.job.status === 'Completed');
  const filtered = useMemo(() => orders.filter((order) => matchesFilter(order)
    && `${order.invoiceNumber} ${order.customer} ${order.phone || ''}`.toLowerCase().includes(search.toLowerCase())), [orders, search, filter]);
  const pendingAccounts = orders.filter((order) => order.approval === 'Pending Accounts');
  const inProduction = orders.filter((order) => ['Assigned', 'In Progress'].includes(order.job.status));
  const ready = orders.filter((order) => ['Ready', 'Ready for Collection'].includes(order.job.status));
  const outstanding = orders.filter((order) => !['Fully Paid', 'Paid'].includes(order.paymentStatus));
  const totalFor = (items) => items.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const productionStatus = (order) => order.approval === 'Pending Accounts' ? 'Pending Accounts' : order.job.status === 'Ready' ? 'Ready for Collection' : order.job.status || order.orderStatus || 'In Production';

  if (selectedOrder) {
    return <OrderDetailsPage order={selectedOrder} onBack={() => setSelectedOrder(null)} />;
  }

  return (
    <div className="store-orders-table-page">
      <div className="orders-breadcrumb">Orders &nbsp;›&nbsp; <strong>Orders Overview</strong></div>
      <section className="orders-table-kpis">{[
        ['◷', 'Pending Accounts', pendingAccounts.length, totalFor(pendingAccounts), 'gold'],
        ['▣', 'In Production', inProduction.length, totalFor(inProduction), 'blue'],
        ['▱', 'Ready for Collection', ready.length, totalFor(ready), 'green'],
        ['!', 'Outstanding Payments', outstanding.length, totalFor(outstanding), 'red'],
      ].map(([icon, label, value, total, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong><p>Orders</p><b>{money.format(total)}</b></span></article>)}</section>
      <section className="orders-register">
        <header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by invoice number, customer name or phone..." /></label><div className="order-date-filter">▣ &nbsp; From date &nbsp;&nbsp; → &nbsp;&nbsp; To date &nbsp; ▣</div><button>▽ &nbsp; Filters &nbsp;⌄</button></header>
        <nav><div>{['All', 'Unpaid', 'Partial Paid', 'Paid', 'Pending Accounts', 'In Production', 'Ready for Collection', 'Completed', 'Issues'].map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><select><option>Sort by: Newest First</option><option>Oldest First</option></select></nav>
        <div className="orders-register-table"><table><thead><tr><th>Invoice No.</th><th>Customer</th><th>Items</th><th>Invoice Total</th><th>Payment Status</th><th>Delivery Date</th><th>Production Status</th><th>Created On</th><th>Actions</th></tr></thead><tbody>{filtered.slice(0, 10).map((order, index) => {
          const delivery = order.job.delivery || order.deliveryDate;
          const status = productionStatus(order);
          return <tr key={order.invoiceNumber}><td><strong>{order.invoiceNumber}</strong><small>Order #{1256-index*15}</small></td><td><div className="order-customer-cell"><i>{order.customer?.split(' ').map((part) => part[0]).join('').slice(0,2)}</i><span><strong>{order.customer}</strong><small>{order.phone || order.job.phone || '—'}</small></span></div></td><td>{order.pieces || order.job.pieces || 1}<small>pieces</small></td><td><strong>{money.format(order.total)}</strong></td><td><Status>{order.paymentStatus}</Status><small>{order.paymentStatus === 'Fully Paid' ? 'Paid in Full' : `${money.format(order.paid || 0)} paid`}</small></td><td>{delivery ? new Date(`${String(delivery).slice(0,10)}T00:00:00`).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : 'Not set'}<small className={index > 2 ? 'late' : ''}>{index > 2 ? 'Overdue' : `${4-index} days left`}</small></td><td><Status>{status}</Status><small>{status === 'Pending Accounts' ? 'Awaiting confirmation' : status === 'Ready for Collection' ? 'Awaiting pickup' : 'With Production'}</small></td><td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td><td className="order-action-cell"><button className="order-more" onClick={() => setOpenMenu(openMenu === order.invoiceNumber ? null : order.invoiceNumber)}>⋮</button>{openMenu === order.invoiceNumber ? <div className="order-action-dropdown">{[['◉','View Order'],['▤','View Invoice'],['♙','View Customer'],['✉','Email Customer'],['♧','Email Accounts']].map(([icon,label])=><button key={label} onClick={() => { setOpenMenu(null); if (label === 'View Order') setSelectedOrder(order); }}><i>{icon}</i>{label}</button>)}</div>:null}</td></tr>;
        })}</tbody></table>{!filtered.length ? <div className="accounts-empty">No orders match this view.</div> : null}</div>
        <div className="owner-mobile-order-list">{filtered.slice(0, 10).map((order, index) => {
          const delivery = order.job.delivery || order.deliveryDate;
          const status = productionStatus(order);
          return <article key={order.invoiceNumber}>
            <header><div><small>{order.invoiceNumber}</small><h3>{order.customer}</h3><span>{order.phone || order.job.phone || 'No phone number'}</span></div><Status>{status}</Status></header>
            <section><div><small>Invoice Total</small><strong>{money.format(order.total)}</strong></div><div><small>Items</small><strong>{order.pieces || order.job.pieces || 1} pieces</strong></div><div><small>Payment</small><Status>{order.paymentStatus}</Status></div><div><small>Delivery</small><strong>{delivery ? new Date(`${String(delivery).slice(0,10)}T00:00:00`).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : 'Not set'}</strong><span className={index > 2 ? 'late' : ''}>{index > 2 ? 'Overdue' : `${Math.max(1,4-index)} days left`}</span></div></section>
            <footer><span>Created {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span><button type="button" onClick={() => setSelectedOrder(order)}>View Order &nbsp;›</button></footer>
          </article>;
        })}{!filtered.length ? <div className="accounts-empty">No orders match this view.</div> : null}</div>
        <footer><span>Showing {filtered.length ? 1 : 0} to {Math.min(10,filtered.length)} of {orders.length} orders</span><div><button>‹</button><button className="active">1</button><button>2</button><button>›</button></div><label>Rows per page: <select><option>10</option><option>20</option></select></label></footer>
      </section>
    </div>
  );
}
