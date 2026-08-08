import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Package, CheckCircle, AlertCircle, Search, ChevronRight, Eye } from 'lucide-react';
import { money, invoiceApprovalStatus } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import OrderDetailsPage from './OrderDetailsPage';

const KPI_COUNT = 4;

export default function StoreManagerOrdersPage({ sentInvoices = [] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

  const orders = sentInvoices.map((invoice) => ({ ...invoice, job: invoice.orderSheet || {}, approval: invoiceApprovalStatus(invoice) }));
  const matchesFilter = (order) => filter === 'All'
    || (filter === 'Unpaid' && !['Fully Paid', 'Paid', 'Partial Paid'].includes(order.paymentStatus))
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

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (selectedOrder) {
    return <OrderDetailsPage order={selectedOrder} onBack={() => { setSelectedOrder(null); window.scrollTo(0, 0); }} />;
  }

  const kpis = [
    { Icon: Clock, label: 'Pending Accounts', count: pendingAccounts.length, total: totalFor(pendingAccounts), tone: '#fffbf0', iconColor: '#c97b08', textColor: '#7a6030' },
    { Icon: Package, label: 'In Production', count: inProduction.length, total: totalFor(inProduction), tone: '#f0f4ff', iconColor: '#3a5098', textColor: '#3a5098' },
    { Icon: CheckCircle, label: 'Ready for Collection', count: ready.length, total: totalFor(ready), tone: '#f0faf4', iconColor: '#2a7d4f', textColor: '#2a7d4f' },
    { Icon: AlertCircle, label: 'Outstanding Payments', count: outstanding.length, total: totalFor(outstanding), tone: '#fff5f0', iconColor: '#8a3520', textColor: '#8a3520' },
  ];

  const filterTabs = ['All', 'Unpaid', 'Partial Paid', 'Paid', 'Pending Accounts', 'In Production', 'Ready for Collection', 'Completed'];

  return (
    <div className="os-page">
      {/* Page header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Package size={22} strokeWidth={1.8} />
          <div>
            <h2>Orders</h2>
            <p>Track production, payments and deliveries across all orders</p>
          </div>
        </div>
      </div>

      {/* KPI stat cards */}
      <div className="os-kpi-row" ref={kpiScrollRef} onScroll={handleKpiScroll}>
        {kpis.map(({ Icon, label, count, total, tone, iconColor, textColor }) => (
          <div key={label} className="os-card" style={{ background: tone, borderColor: '#eee5da' }}>
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <Icon size={18} strokeWidth={1.8} style={{ color: iconColor }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1611', lineHeight: 1.2, marginTop: 4 }}>{count}</div>
                <div style={{ fontSize: 12, color: textColor, fontWeight: 600 }}>{money.format(total)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="os-card">
        <div className="os-card-body" style={{ gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{
              flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
            }}>
              <Search size={15} strokeWidth={1.8} style={{ color: '#b0a090', flexShrink: 0 }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by invoice number, customer name or phone..."
                style={{ border: 'none', outline: 'none', fontSize: 14, color: '#1a1611', background: 'transparent', flex: 1 }}
              />
            </label>
            <label className="os-field" style={{ minWidth: 160 }}>
              <select>
                <option>Sort by: Newest First</option>
                <option>Oldest First</option>
              </select>
            </label>
          </div>
          {/* Tab pills */}
          <nav className="os-filter-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filterTabs.map((item) => (
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
              {['Invoice No.', 'Customer', 'Items', 'Invoice Total', 'Payment', 'Delivery Date', 'Production', 'Created', 'Actions'].map((col) => (
                <th key={col} style={{
                  padding: '11px 14px', textAlign: 'left', fontSize: 11,
                  fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase',
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 10).map((order, index) => {
              const delivery = order.job.delivery || order.deliveryDate;
              const status = productionStatus(order);
              const custInitials = order.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2);
              return (
                <tr
                  key={order.invoiceNumber}
                  style={{ borderBottom: '1px solid #f3ede5', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#0f0b06' }}>{order.invoiceNumber}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>Order #{1256 - index * 15}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', background: '#0f0b06',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>{custInitials}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#3d352c' }}>{order.customer}</div>
                        <div style={{ fontSize: 11, color: '#8a7a6a' }}>{order.phone || order.job.phone || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>
                    {order.pieces || order.job.pieces || 1}
                    <span style={{ fontSize: 11, color: '#8a7a6a', marginLeft: 3 }}>pcs</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13, color: '#1a1611' }}>{money.format(order.total)}</td>
                  <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                    <Status>{order.paymentStatus}</Status>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 3 }}>
                      {order.paymentStatus === 'Fully Paid' ? 'Paid in Full' : `${money.format(order.paid || 0)} paid`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, color: '#5a4e42' }}>
                      {delivery ? new Date(`${String(delivery).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: index > 2 ? '#8a3520' : '#2a7d4f', marginTop: 2 }}>
                      {index > 2 ? 'Overdue' : `${4 - index} days left`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                    <Status>{status}</Status>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 3 }}>
                      {status === 'Pending Accounts' ? 'Awaiting confirm' : status === 'Ready for Collection' ? 'Awaiting pickup' : 'With Production'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setOpenMenu(openMenu === order.invoiceNumber ? null : order.invoiceNumber)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
                          fontSize: 12, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} strokeWidth={1.8} /> View
                      </button>
                      {openMenu === order.invoiceNumber ? (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
                          background: '#fff', border: '1px solid #eee5da', borderRadius: 10,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160, overflow: 'hidden',
                        }}>
                          {[['View Order'], ['View Invoice'], ['View Customer'], ['Email Customer'], ['Email Accounts']].map(([label]) => (
                            <button
                              key={label}
                              onClick={() => { setOpenMenu(null); if (label === 'View Order') setSelectedOrder(order); }}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                                fontSize: 13, fontWeight: 500, color: '#1a1611', background: 'none',
                                border: 'none', cursor: 'pointer', borderBottom: '1px solid #f3ede5',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >{label}</button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 14 }}>
            No orders match this view.
          </div>
        ) : null}
      </div>

      {/* Mobile card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="os-customers-mobile-list">
        {filtered.slice(0, 10).map((order, index) => {
          const delivery = order.job.delivery || order.deliveryDate;
          const status = productionStatus(order);
          const custInitials = order.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2);
          return (
            <div key={`m-${order.invoiceNumber}`} className="os-card">
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: '#0f0b06',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                  }}>{custInitials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f0b06' }}>{order.invoiceNumber}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#3d352c' }}>{order.customer}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>{order.phone || order.job.phone || 'No phone'}</div>
                  </div>
                </div>
                <Status>{status}</Status>
              </div>
              <div style={{ borderTop: '1px solid #f3ede5', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoice Total</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1611', marginTop: 2 }}>{money.format(order.total)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment</div>
                  <div style={{ marginTop: 2 }}><Status>{order.paymentStatus}</Status></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Delivery</div>
                  <div style={{ fontSize: 12, color: '#1a1611', marginTop: 2 }}>
                    {delivery ? new Date(`${String(delivery).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: index > 2 ? '#8a3520' : '#2a7d4f', marginTop: 1 }}>
                    {index > 2 ? 'Overdue' : `${Math.max(1, 4 - index)} days left`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Items</div>
                  <div style={{ fontSize: 12, color: '#1a1611', marginTop: 2 }}>{order.pieces || order.job.pieces || 1} pieces</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f3ede5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#8a7a6a' }}>
                  Created {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', border: '1px solid #ddd5c8', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
                  }}
                >
                  View Order <ChevronRight size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
        {!filtered.length ? (
          <div className="os-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 14 }}>
            No orders match this view.
          </div>
        ) : null}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#8a7a6a' }}>
          Showing {filtered.length ? 1 : 0}–{Math.min(10, filtered.length)} of {orders.length} orders
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {['‹', '1', '2', '›'].map((p) => (
            <button key={p} style={{
              padding: '6px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
              fontSize: 13, fontWeight: p === '1' ? 700 : 400,
              background: p === '1' ? '#1a1611' : '#fff',
              color: p === '1' ? '#fff' : '#5a4e42', cursor: 'pointer',
            }}>{p}</button>
          ))}
          <label style={{ fontSize: 13, color: '#8a7a6a', marginLeft: 8 }}>
            Rows:&nbsp;
            <select style={{ fontSize: 13, border: '1px solid #ddd5c8', borderRadius: 6, padding: '4px 8px', color: '#1a1611' }}>
              <option>10</option><option>20</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
