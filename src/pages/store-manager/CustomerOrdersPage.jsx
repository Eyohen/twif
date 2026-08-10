import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Package, ChevronRight, User, Phone, MapPin, TrendingUp, Calendar, CreditCard, BarChart2 } from 'lucide-react';
import { money, daysUntilDue, dueDateLabel } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

function normalizeOrder(invoice) {
  const status = invoice.orderSheet?.status || invoice.orderStatus || 'In Production';
  // "4 days left" was fixed text against every order in production. The
  // delivery date the order actually carries says how long is really left, and
  // an order already collected-ready is not chased for it.
  const settled = ['Ready', 'Ready for Collection'].includes(status);
  const days = settled ? null : daysUntilDue(invoice.deliveryDate);
  return {
    ...invoice,
    description: invoice.description || `${invoice.pieces || 1} Piece`,
    orderDate: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    deliveryDate: invoice.deliveryDate ? new Date(invoice.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    status,
    dueLabel: days === null ? '' : dueDateLabel(invoice.deliveryDate),
    overdue: days !== null && days < 0,
  };
}

export default function CustomerOrdersPage({ customer, sentInvoices = [], onBack, onOpenOrder }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Orders');
  const customerInvoices = sentInvoices.filter((invoice) => invoice.customer === customer.fullName);
  const orders = customerInvoices.map(normalizeOrder);
  // The pill labels are the store's language; the underlying order sheet uses
  // its own status names, so each pill maps to the statuses it covers.
  const STATUSES_BY_FILTER = {
    'Awaiting Production': ['Order Sheet Confirmed'],
    'In Production': ['Assigned', 'In Progress'],
    'Ready for Collection': ['Ready', 'Ready for Collection'],
  };

  const filtered = useMemo(() => orders.filter((order) => {
    const matchesSearch = `${order.invoiceNumber} ${order.item} ${order.status}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All Orders'
      || (filter === 'Active' && !['Ready', 'Ready for Collection'].includes(order.status))
      || (STATUSES_BY_FILTER[filter] || []).includes(order.status);
    return matchesSearch && matchesFilter;
  }), [orders, search, filter]);
  const ready = orders.filter((order) => ['Ready', 'Ready for Collection'].includes(order.status)).length;
  const active = orders.length - ready;
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const initials = customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return (
    <div className="os-page">
      {/* Header */}
      <div className="os-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, background: 'none',
              border: '1px solid #ddd5c8', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, color: '#5a4e42', cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back
          </button>
          <div className="os-page-title">
            <Package size={22} strokeWidth={1.8} />
            <div>
              <h2>{customer.fullName} — Orders</h2>
              <p>View all orders placed by this customer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer banner */}
      <div className="os-card">
        <div className="os-card-head">
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#1a1611',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16, fontFamily: 'var(--font-display)' }}>{customer.fullName}</strong>
              <span style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: Number(customer.totalOrders) > 1 ? '#f0faf4' : '#fffbf0',
                color: Number(customer.totalOrders) > 1 ? '#2a7d4f' : '#7a6030',
              }}>
                {Number(customer.totalOrders) > 1 ? 'Returning' : 'New'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 5 }}>
              {customer.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5a4e42' }}>
                  <Phone size={11} strokeWidth={1.8} style={{ color: '#c97b08' }} />
                  {customer.phone}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5a4e42' }}>
                <MapPin size={11} strokeWidth={1.8} style={{ color: '#c97b08' }} />
                {customer.stores?.[0] || 'Lekki'} Store
              </span>
              <span style={{ fontSize: 12, color: '#8a7a6a' }}>
                Since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2025'}
              </span>
            </div>
          </div>
        </div>
        {/* KPI row */}
        <div className="os-stat-strip" style={{ borderTop: '1px solid #f3ede5' }}>
          {[
            { Icon: Package, label: 'Total Orders', value: orders.length },
            { Icon: TrendingUp, label: 'Active Orders', value: active },
            { Icon: Calendar, label: 'Ready for Collection', value: ready },
            { Icon: CreditCard, label: 'Total Spent', value: money.format(totalSpent) },
          ].map(({ Icon, label, value }, i) => (
            <div key={label} style={{
              padding: '12px 16px', borderRight: i < 3 ? '1px solid #f3ede5' : 'none', textAlign: 'center',
            }}>
              <Icon size={14} strokeWidth={1.8} style={{ color: '#c97b08', margin: '0 auto 4px' }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1611' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#8a7a6a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="os-card">
        <div className="os-card-body" style={{ gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{
              flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
            }}>
              <Search size={15} strokeWidth={1.8} style={{ color: '#b0a090', flexShrink: 0 }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by invoice number, item, status..."
                style={{ border: 'none', outline: 'none', fontSize: 14, color: '#1a1611', background: 'transparent', flex: 1 }}
              />
            </label>
          </div>
          <nav className="os-filter-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All Orders', 'Active', 'Awaiting Production', 'In Production', 'Ready for Collection'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: filter === item ? 'none' : '1px solid #ddd5c8',
                  background: filter === item ? '#1a1611' : 'transparent',
                  color: filter === item ? '#fff' : '#5a4e42',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{item}</button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop table */}
      <div className="os-desktop-table" style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee5da', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#faf7f3' }}>
              {['Invoice No.', 'Item / Description', 'Pieces', 'Status', 'Order Date', 'Delivery Date', 'Total', 'Actions'].map((col) => (
                <th key={col} style={{
                  padding: '11px 14px', textAlign: 'left', fontSize: 11,
                  fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase',
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr
                key={order.invoiceNumber}
                style={{ borderBottom: '1px solid #f3ede5' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, background: '#f3ede5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Package size={14} strokeWidth={1.8} style={{ color: '#c97b08' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1611' }}>{order.invoiceNumber}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1611' }}>{order.item || 'Custom Outfit'}</div>
                  <div style={{ fontSize: 11, color: '#8a7a6a' }}>{order.description}</div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{order.pieces || 1}</td>
                <td style={{ padding: '12px 14px' }}>
                  <Status>{order.status}</Status>
                  <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 3 }}>
                    {['Assigned', 'In Progress', 'In Production'].includes(order.status) ? 'With Production'
                      : ['Ready', 'Ready for Collection'].includes(order.status) ? 'Waiting for the customer'
                      : 'Not started'}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{order.orderDate}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, color: '#5a4e42' }}>{order.deliveryDate}</div>
                  {order.dueLabel ? (
                    <div style={{ fontSize: 11, color: order.overdue ? '#8a3520' : '#8a7a6a', fontWeight: 600, marginTop: 2 }}>{order.dueLabel}</div>
                  ) : null}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{money.format(order.total)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <button
                    type="button"
                    onClick={() => onOpenOrder?.(order)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
                      fontSize: 12, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 13 }}>
            No orders match this view.
          </div>
        )}
      </div>

      {/* Mobile card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="os-customers-mobile-list">
        {filtered.map((order) => (
          <div key={`m-${order.invoiceNumber}`} className="os-card">
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, background: '#f3ede5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Package size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f0b06' }}>{order.invoiceNumber}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#3d352c', marginTop: 2 }}>{order.item}</div>
                  <div style={{ fontSize: 12, color: '#8a7a6a' }}>{order.description}</div>
                </div>
              </div>
              <Status>{order.status}</Status>
            </div>
            <div style={{ borderTop: '1px solid #f3ede5', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1611', marginTop: 2 }}>{money.format(order.total)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Delivery</div>
                <div style={{ fontSize: 12, color: '#1a1611', marginTop: 2 }}>{order.deliveryDate}</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f3ede5', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => onOpenOrder?.(order)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', border: '1px solid #ddd5c8', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
                }}
              >
                View Details <ChevronRight size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
        {!filtered.length ? (
          <div className="os-card" style={{ textAlign: 'center', padding: '32px 20px', color: '#8a7a6a', fontSize: 13 }}>
            No orders match this view.
          </div>
        ) : null}
      </div>

      {/* Summary sidebar row */}
      <div className="os-layout">
        <div />
        <aside className="os-sidebar">
          <div className="os-summary-card">
            <header>
              <BarChart2 size={15} strokeWidth={1.8} />
              <h3>Order Summary</h3>
            </header>
            <dl>
              <dt>Total Orders</dt><dd>{orders.length}</dd>
              <dt>Total Spent</dt><dd>{money.format(totalSpent)}</dd>
              <dt>Average Order Value</dt><dd>{money.format(orders.length ? totalSpent / orders.length : 0)}</dd>
              <dt>Still in hand</dt><dd>{active}</dd>
              <dt>Ready for collection</dt><dd>{ready}</dd>
            </dl>
          </div>
        </aside>
      </div>

      <div style={{ padding: '4px 0', fontSize: 13, color: '#8a7a6a' }}>
        Showing {filtered.length ? 1 : 0}–{filtered.length} of {orders.length} orders
      </div>
    </div>
  );
}
