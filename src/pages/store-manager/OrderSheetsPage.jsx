import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock, Package, CheckCircle, Search, ChevronRight, Eye, Edit2, Plus } from 'lucide-react';
import { formatMoment, dueDateLabel, daysUntilDue } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import OrderSheetDetailsPage from './OrderSheetDetailsPage';
import Pagination from '../../components/oms/Pagination';

const PAGE_SIZE = 10;

// An order sheet only shows up here once it exists — an invoice still
// waiting for one belongs on the Orders page, not this one.
export default function StoreManagerOrderSheetsPage({ sentInvoices = [], onNavigate }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sortOrder, setSortOrder] = useState('Newest First');
  const [page, setPage] = useState(1);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const sheets = useMemo(() => sentInvoices
    .filter((invoice) => invoice.orderSheet?.status)
    .map((invoice) => ({ ...invoice, sheet: invoice.orderSheet })),
  [sentInvoices]);

  // Correcting an order sheet is only safe while Production has not yet
  // handed it to anyone — past that point, a tailor is already working from
  // what is on it.
  const mayEdit = (sheet) => sheet.status === 'Order Sheet Confirmed';

  const matchesFilter = (order) => filter === 'All'
    || (filter === 'Awaiting Tailor' && order.sheet.status === 'Order Sheet Confirmed')
    || (filter === 'Assigned' && order.sheet.status === 'Assigned')
    || (filter === 'In Progress' && order.sheet.status === 'In Progress')
    || (filter === 'Ready for Collection' && ['Ready', 'Ready for Collection'].includes(order.sheet.status));

  const orderedAt = (order) => new Date(order.sheet.updatedAt || order.sheet.createdAt || order.createdAt || 0).getTime();
  const filtered = useMemo(() => sheets
    .filter((order) => matchesFilter(order)
      && `${order.invoiceNumber} ${order.customer} ${order.phone || ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sortOrder === 'Oldest First' ? orderedAt(a) - orderedAt(b) : orderedAt(b) - orderedAt(a))),
  [sheets, search, filter, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const awaitingTailor = sheets.filter((order) => order.sheet.status === 'Order Sheet Confirmed');
  const inProduction = sheets.filter((order) => ['Assigned', 'In Progress'].includes(order.sheet.status));
  const ready = sheets.filter((order) => ['Ready', 'Ready for Collection'].includes(order.sheet.status));

  if (selectedSheet) {
    return (
      <OrderSheetDetailsPage
        order={selectedSheet}
        onBack={() => { setSelectedSheet(null); window.scrollTo(0, 0); }}
        onEdit={(invoiceNumber) => onNavigate?.('Order Sheet', { edit: invoiceNumber })}
      />
    );
  }

  const kpis = [
    { Icon: ClipboardList, label: 'Order Sheets', count: sheets.length, tone: '#fffbf0', iconColor: '#c97b08' },
    { Icon: Clock, label: 'Awaiting Tailor', count: awaitingTailor.length, tone: '#fff5f0', iconColor: '#8a3520' },
    { Icon: Package, label: 'In Production', count: inProduction.length, tone: '#f0f4ff', iconColor: '#3a5098' },
    { Icon: CheckCircle, label: 'Ready for Collection', count: ready.length, tone: '#f0faf4', iconColor: '#2a7d4f' },
  ];

  const filterTabs = ['All', 'Awaiting Tailor', 'Assigned', 'In Progress', 'Ready for Collection'];

  const itemsSummary = (sheet) => {
    const items = Array.isArray(sheet.items) && sheet.items.length ? sheet.items : [{ item: sheet.item }];
    const pieces = items.reduce((sum, item) => sum + (Number(item.pieces) || 1), 0);
    return { label: items[0]?.item || 'Item not named', count: items.length, pieces };
  };

  const tailorLabel = (sheet) => {
    if (!sheet.tailor || sheet.tailor === 'Unassigned') return 'Unassigned';
    const extra = (sheet.tailors?.length || 0) - 1;
    return extra > 0 ? `${sheet.tailor} +${extra} more` : sheet.tailor;
  };

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <ClipboardList size={22} strokeWidth={1.8} />
          <div>
            <h2>Order Sheets</h2>
            <p>Every order sheet raised, and whether Production has assigned a tailor yet</p>
          </div>
        </div>
        <button
          type="button"
          className="os-release-btn"
          style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
          onClick={() => onNavigate?.('Order Sheet')}
        >
          <Plus size={15} strokeWidth={2} />
          New Order Sheet
        </button>
      </div>

      {/* KPI stat cards */}
      <div className="kpi-carousel-wrap">
        <div className="os-kpi-row">
          {kpis.map(({ Icon, label, count, tone, iconColor }) => (
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
                </div>
              </div>
            </div>
          ))}
        </div>
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
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
            </label>
          </div>
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
              {['Invoice No.', 'Customer', 'Item(s)', 'Store', 'Delivery Date', 'Tailor', 'Status', 'Created', 'Actions'].map((col) => (
                <th key={col} style={{
                  padding: '11px 14px', textAlign: 'left', fontSize: 11,
                  fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase',
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => {
              const { sheet } = order;
              const summary = itemsSummary(sheet);
              const delivery = sheet.delivery || order.deliveryDate;
              const editable = mayEdit(sheet);
              return (
                <tr
                  key={order.invoiceNumber}
                  style={{ borderBottom: '1px solid #f3ede5', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  onClick={() => setSelectedSheet(order)}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#0f0b06' }}>{order.invoiceNumber}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{sheet.id || ''}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#3d352c' }}>{order.customer}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{order.phone || sheet.phone || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>
                    <div>{summary.label}{summary.count > 1 ? ` +${summary.count - 1} more` : ''}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{summary.pieces} pc{summary.pieces === 1 ? '' : 's'}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{sheet.store || order.store || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, color: '#5a4e42' }}>{delivery ? formatMoment(delivery) : 'Not set'}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: daysUntilDue(delivery) !== null && daysUntilDue(delivery) < 0 ? '#8a3520' : '#2a7d4f', marginTop: 2 }}>
                      {dueDateLabel(delivery)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: sheet.tailor && sheet.tailor !== 'Unassigned' ? '#1a1611' : '#8a7a6a', fontWeight: sheet.tailor && sheet.tailor !== 'Unassigned' ? 700 : 400 }}>
                    {tailorLabel(sheet)}
                  </td>
                  <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                    <Status>{sheet.status}</Status>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedSheet(order)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
                          fontSize: 12, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <Eye size={12} strokeWidth={1.8} /> View
                      </button>
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => onNavigate?.('Order Sheet', { edit: order.invoiceNumber })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
                            fontSize: 12, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          <Edit2 size={12} strokeWidth={1.8} /> Edit
                        </button>
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
            No order sheets match this view.
          </div>
        ) : null}
      </div>

      {/* Mobile card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="os-customers-mobile-list">
        {visible.map((order) => {
          const { sheet } = order;
          const summary = itemsSummary(sheet);
          const delivery = sheet.delivery || order.deliveryDate;
          const editable = mayEdit(sheet);
          return (
            <div key={`m-${order.invoiceNumber}`} className="os-card">
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f0b06' }}>{order.invoiceNumber}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#3d352c' }}>{order.customer}</div>
                  <div style={{ fontSize: 12, color: '#8a7a6a' }}>{summary.label}{summary.count > 1 ? ` +${summary.count - 1} more` : ''} · {summary.pieces} pc{summary.pieces === 1 ? '' : 's'}</div>
                </div>
                <Status>{sheet.status}</Status>
              </div>
              <div style={{ borderTop: '1px solid #f3ede5', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tailor</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611', marginTop: 2 }}>{tailorLabel(sheet)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Delivery</div>
                  <div style={{ fontSize: 12, color: '#1a1611', marginTop: 2 }}>{delivery ? formatMoment(delivery) : 'Not set'}</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f3ede5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#8a7a6a' }}>
                  Created {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSheet(order)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', border: '1px solid #ddd5c8', borderRadius: 8,
                      fontSize: 13, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
                    }}
                  >
                    View <ChevronRight size={13} strokeWidth={2} />
                  </button>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => onNavigate?.('Order Sheet', { edit: order.invoiceNumber })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', border: '1px solid #ddd5c8', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
                      }}
                    >
                      <Edit2 size={13} strokeWidth={1.8} /> Edit
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length ? (
          <div className="os-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#8a7a6a', fontSize: 14 }}>
            No order sheets match this view.
          </div>
        ) : null}
      </div>

      <Pagination
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPage={setPage}
        noun="order sheets"
      />
    </div>
  );
}
