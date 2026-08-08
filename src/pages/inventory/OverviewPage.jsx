import { useEffect, useMemo, useState } from 'react';
import { Box, AlertTriangle, XCircle, Package, LayoutGrid, PlusCircle, List, Boxes, TrendingUp, ChevronRight, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import { money, formatMoment, isInvoiceApproved } from '../../utils/oms';
import { stockStatus, itemImageUrl } from './item';
import ItemDetailsPage from './ItemDetailsPage';

const TONE_COLORS = {
  gold: { bg: '#fff8ee', color: '#c97b08', iconBg: '#fff1d6' },
  orange: { bg: '#fff5e8', color: '#e48600', iconBg: '#fff0d6' },
  red: { bg: '#fff5f0', color: '#c0392b', iconBg: '#ffe8e4' },
  blue: { bg: '#eaf2ff', color: '#1767df', iconBg: '#dbeafe' },
  green: { bg: '#f0faf4', color: '#2a7d4f', iconBg: '#dcf5e8' },
  purple: { bg: '#f5f0ff', color: '#6b3fa0', iconBg: '#ede4ff' },
};

const startOfDay = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const th = { textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '9px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #eee5da' };
const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' };
const linkButton = { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 };

// Every number and every row on this page used to be written into the source:
// 156 fabrics, 8 low, 5 out, four named alerts, four pending allocations and
// four allocations "released today" — none of which had any connection to the
// shop's stock. It all reads from the inventory now.
export default function InventoryOverviewPage({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.allSettled([
      api.get('/oms/fabrics'),
      api.get('/oms/fabrics/allocations'),
      api.get('/oms/invoices/sent'),
    ]).then(([fabricsResult, allocationsResult, invoicesResult]) => {
      if (!live) return;
      setItems(fabricsResult.value?.data?.data?.fabrics || []);
      setAllocations(allocationsResult.value?.data?.data?.allocations || []);
      setInvoices(invoicesResult.value?.data?.data?.invoices || []);
      setLoading(false);
    });
    return () => { live = false; };
  }, []);

  const today = startOfDay(new Date());
  const alerts = useMemo(() => items
    .filter((item) => stockStatus(item) !== 'In Stock')
    .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0)), [items]);
  const todaysAllocations = useMemo(() => allocations.filter((row) => startOfDay(row.createdAt) === today), [allocations, today]);

  // An approved invoice that has had no fabric released against it is still
  // waiting on this desk.
  const awaitingFabric = useMemo(() => {
    const allocated = new Set(allocations.map((row) => row.invoiceNumber).filter(Boolean));
    return invoices.filter((invoice) => isInvoiceApproved(invoice) && !allocated.has(invoice.invoiceNumber));
  }, [invoices, allocations]);

  const stockValue = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0), 0);

  if (openItem) {
    return <ItemDetailsPage itemId={openItem.id} fallbackItem={openItem} onBack={() => setOpenItem(null)} onEdit={() => onNavigate?.('Inventory')} />;
  }

  const kpis = [
    { icon: <Box size={20} />, label: 'Items', value: items.length, detail: 'Records in inventory', tone: 'gold' },
    { icon: <AlertTriangle size={20} />, label: 'Low Stock', value: items.filter((item) => stockStatus(item) === 'Low Stock').length, detail: 'At or below threshold', tone: 'orange' },
    { icon: <XCircle size={20} />, label: 'Out of Stock', value: items.filter((item) => stockStatus(item) === 'Out of Stock').length, detail: 'Nothing left on the shelf', tone: 'red' },
    { icon: <Package size={20} />, label: 'Allocated Today', value: todaysAllocations.length, detail: 'Releases to production', tone: 'blue' },
    { icon: <TrendingUp size={20} />, label: 'Stock Value', value: stockValue ? money.format(stockValue) : '—', detail: stockValue ? 'Quantity × unit cost' : 'No costs recorded yet', tone: 'green' },
  ];

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} />
          <div>
            <h2>Inventory Overview</h2>
            <p>Stock levels, alerts and what has gone out to production</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('Inventory')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <PlusCircle size={14} /> Manage Inventory
        </button>
      </div>

      <div className="kpi-carousel-wrap">
        <section className="inventory-overview-kpis">
          {kpis.map(({ icon, label, value, detail, tone }) => (
            <article className={tone} key={label}>
              <i>{icon}</i>
              <span>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{detail}</p>
              </span>
            </article>
          ))}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Inventory Alerts */}
        <div className="os-card">
          <div className="os-card-head">
            <AlertTriangle size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Inventory Alerts</strong>
              <p>Low stock and out-of-stock items</p>
            </div>
            <button type="button" onClick={() => onNavigate?.('Inventory')} style={linkButton}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {alerts.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Item', 'Type', 'Remaining', 'Status', ''].map((col) => <th key={col} style={th}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 5).map((item) => {
                    const status = stockStatus(item);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setOpenItem(item)}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(event) => { event.currentTarget.style.background = '#faf7f3'; }}
                        onMouseLeave={(event) => { event.currentTarget.style.background = ''; }}
                      >
                        <td style={{ ...td, fontWeight: 600, color: '#1a1611' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {itemImageUrl(item)
                              ? <img src={itemImageUrl(item)} alt="" style={{ width: 26, height: 26, borderRadius: 5, objectFit: 'cover', border: '1px solid #eee5da' }} />
                              : null}
                            {item.name}
                          </span>
                        </td>
                        <td style={{ ...td, fontSize: 12, color: '#5a4e42' }}>{item.type}</td>
                        <td style={{ ...td, fontWeight: 700, color: status === 'Out of Stock' ? '#8a3520' : '#7a6030' }}>
                          {Number(item.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}
                        </td>
                        <td style={td}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, ...(status === 'Out of Stock' ? { background: '#fff5f0', color: '#8a3520' } : { background: '#fffbf0', color: '#7a6030' }) }}>
                            {status}
                          </span>
                        </td>
                        <td style={td}>
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); setOpenItem(item); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, padding: '28px 16px', textAlign: 'center', fontSize: 13, color: '#8a7a6a' }}>
                {loading ? 'Loading stock…' : 'Nothing is low or out of stock.'}
              </p>
            )}
          </div>
        </div>

        {/* Awaiting fabric */}
        <div className="os-card">
          <div className="os-card-head">
            <Package size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Awaiting Fabric</strong>
              <p>Approved invoices with nothing released yet</p>
            </div>
            <button type="button" onClick={() => onNavigate?.('Orders')} style={linkButton}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {awaitingFabric.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Invoice', 'Customer', 'Item', 'Due'].map((col) => <th key={col} style={th}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {awaitingFabric.slice(0, 5).map((invoice) => (
                    <tr key={invoice.invoiceNumber}>
                      <td style={{ ...td, fontSize: 12, fontFamily: 'monospace', color: '#5a4e42' }}>{invoice.invoiceNumber}</td>
                      <td style={{ ...td, fontWeight: 600, color: '#1a1611' }}>{invoice.customer}</td>
                      <td style={{ ...td, color: '#5a4e42' }}>{invoice.item || '—'}</td>
                      <td style={{ ...td, fontSize: 12, color: '#8a7a6a' }}>{invoice.deliveryDate ? formatMoment(invoice.deliveryDate) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, padding: '28px 16px', textAlign: 'center', fontSize: 13, color: '#8a7a6a' }}>
                {loading ? 'Loading invoices…' : 'Every approved invoice has had fabric released against it.'}
              </p>
            )}
          </div>
        </div>

        {/* Today's Allocations */}
        <div className="os-card">
          <div className="os-card-head">
            <LayoutGrid size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Today&apos;s Allocations</strong>
              <p>Fabric released to production today</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {todaysAllocations.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Invoice', 'Customer', 'Item', 'Qty', 'Tailor'].map((col) => <th key={col} style={th}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {todaysAllocations.slice(0, 5).map((row) => (
                    <tr key={row.id}>
                      <td style={{ ...td, fontSize: 12, fontFamily: 'monospace', color: '#5a4e42' }}>{row.invoiceNumber}</td>
                      <td style={{ ...td, fontWeight: 600, color: '#1a1611' }}>{row.customerName}</td>
                      <td style={{ ...td, color: '#5a4e42' }}>{row.fabricName}</td>
                      <td style={{ ...td, fontWeight: 700, color: '#1a1611' }}>{Number(row.quantity || 0)} {row.unit}</td>
                      <td style={{ ...td, color: '#5a4e42' }}>{row.tailorName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, padding: '28px 16px', textAlign: 'center', fontSize: 13, color: '#8a7a6a' }}>
                {loading ? 'Loading allocations…' : 'No fabric has been released today.'}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions — only the ones that lead somewhere */}
        <div className="os-card">
          <div className="os-card-head">
            <PlusCircle size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Quick Actions</strong>
              <p>Common inventory tasks</p>
            </div>
          </div>
          <div className="os-card-body">
            <div className="os-grid-2" style={{ gap: 10 }}>
              {[
                { icon: <List size={20} />, title: 'Manage Inventory', detail: 'Add items, edit details, export', tone: 'purple', view: 'Inventory' },
                { icon: <Package size={20} />, title: 'View Orders', detail: 'See what production is working on', tone: 'blue', view: 'Orders' },
              ].map(({ icon, title, detail, tone, view }) => {
                const palette = TONE_COLORS[tone] || TONE_COLORS.gold;
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => onNavigate?.(view)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', background: palette.bg, border: `1px solid ${palette.iconBg}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    onMouseEnter={(event) => { event.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={(event) => { event.currentTarget.style.opacity = '1'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: palette.iconBg, color: palette.color }}>
                      {icon}
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{title}</span>
                      <span style={{ display: 'block', fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="os-card">
        <div className="os-card-head">
          <TrendingUp size={15} style={{ color: '#c0a87a' }} />
          <div>
            <strong>Recent Activity</strong>
            <p>Latest stock movements</p>
          </div>
        </div>
        <div className="os-card-body" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {allocations.length ? allocations.slice(0, 4).map((row) => (
            <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: '1 1 260px', padding: '12px', background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: TONE_COLORS.gold.iconBg, color: TONE_COLORS.gold.color, flexShrink: 0 }}>
                <LayoutGrid size={15} />
              </span>
              <span>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a7a6a', marginBottom: 3 }}>{formatMoment(row.createdAt)}</span>
                <span style={{ display: 'block', fontSize: 13, color: '#1a1611', lineHeight: 1.4 }}>
                  {Number(row.quantity || 0)} {row.unit} {row.fabricName} released for {row.customerName || row.invoiceNumber}
                </span>
              </span>
            </div>
          )) : (
            <p style={{ margin: 0, padding: '12px 2px', fontSize: 13, color: '#8a7a6a' }}>
              {loading ? 'Loading activity…' : 'No stock has moved yet.'}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .os-page > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
