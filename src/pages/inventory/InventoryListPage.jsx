import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, AlertTriangle, XCircle, Layers, Search, RefreshCw, Download, PlusCircle, Boxes, MoreHorizontal, Eye, Edit2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Status } from '../../components/oms/Common';
import ItemDetailsPage from './ItemDetailsPage';
import EditItemPage from './EditItemPage';
import OwnerInventoryApprovalsPage from '../owner/InventoryApprovalsPage';

const fallbackFabrics = [
  ['Black Jacquard', 'FAB-001', 'Suiting', 'Black', 18.5, 'm'], ['White Cotton Poplin', 'FAB-002', 'Shirting', 'White', 0, 'm'],
  ['Green Chiffon', 'FAB-003', 'Dress', 'Green', 3.2, 'm'], ['Linen (Cream)', 'FAB-004', 'Native Wear', 'Cream', 4.8, 'm'],
  ['Navy Blue Wool', 'FAB-005', 'Suiting', 'Navy Blue', 26, 'm'], ['Burgundy Satin', 'FAB-006', 'Dress', 'Burgundy', 6.5, 'm'],
  ['Beige Cotton Twill', 'FAB-007', 'Casual Wear', 'Beige', 2, 'm'], ['Grey Linen Blend', 'FAB-008', 'Suiting', 'Grey', .5, 'm'],
].map(([name, code, type, color, quantity, unit], index) => ({ id: code, name, code, type, color, quantity, unit, lowStockThreshold: 5, updatedAt: `2026-07-${22 - Math.floor(index / 2)}` }));

const stockStatus = (fabric) => Number(fabric.quantity) <= 0 ? 'Out of Stock' : Number(fabric.quantity) <= Number(fabric.lowStockThreshold || 5) ? 'Low Stock' : 'In Stock';

const COLOR_MAP = {
  'black': '#1a1611', 'white': '#f5f5f5', 'navy blue': '#193454', 'green': '#2a5a2a',
  'cream': '#f5f0e0', 'burgundy': '#6b1a1a', 'beige': '#d4c9a8', 'grey': '#8a8a8a',
  'gray': '#8a8a8a', 'blue': '#1767df', 'red': '#c0392b', 'brown': '#7a4a2a',
};
const colorDot = (color = '') => COLOR_MAP[color.toLowerCase()] || COLOR_MAP[color.toLowerCase().split(' ').pop()] || '#b0a090';

export default function InventoryListPage({ currentRole, ownerMode = false }) {
  const [fabrics, setFabrics] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Statuses');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Suiting', quantity: '', unit: 'm', supplier: '', lowStockThreshold: 5 });
  const [message, setMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [showApprovals, setShowApprovals] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const kpiRef = useRef(null);
  const kpiCount = 4;

  const handleKpiScroll = () => {
    const el = kpiRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / (el.scrollWidth / kpiCount));
    setActiveDot(Math.min(index, kpiCount - 1));
  };

  useEffect(() => { api.get('/oms/fabrics').then((response) => { const rows = response.data?.data?.fabrics || []; setFabrics(rows.length ? rows : fallbackFabrics); }).catch(() => setFabrics(fallbackFabrics)); }, []);
  const filtered = useMemo(() => fabrics.filter((fabric) => {
    const searchMatch = `${fabric.name} ${fabric.type} ${fabric.code || fabric.sku || ''}`.toLowerCase().includes(search.toLowerCase());
    return searchMatch && (category === 'All Categories' || fabric.type === category) && (status === 'All Statuses' || stockStatus(fabric) === status);
  }), [fabrics, search, category, status]);
  const categories = [...new Set(fabrics.map((fabric) => fabric.type).filter(Boolean))];
  const totalStock = fabrics.reduce((sum, fabric) => sum + Number(fabric.quantity || 0), 0);
  const submitStock = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/oms/fabrics', { ...form, quantity: Number(form.quantity), lowStockThreshold: Number(form.lowStockThreshold) });
      setFabrics((current) => [...current, response.data?.data?.fabric || { ...form, id: crypto.randomUUID(), code: `FAB-${String(current.length + 1).padStart(3, '0')}`, updatedAt: new Date().toISOString() }]);
      setReceiveOpen(false); setMessage('New stock received successfully.');
    } catch (error) { setMessage(error.response?.data?.message || 'Unable to receive stock.'); }
  };

  if (showApprovals) return <OwnerInventoryApprovalsPage currentRole={currentRole} onBack={() => setShowApprovals(false)} />;
  if (editingItem) return <EditItemPage item={editingItem} currentRole={currentRole} onCancel={() => setEditingItem(null)} onSubmitted={(request) => { setApprovalRequest(request); setEditingItem(null); }} />;
  if (selectedItem) return <ItemDetailsPage item={selectedItem} onBack={() => setSelectedItem(null)} onEdit={ownerMode ? () => setShowApprovals(true) : () => setEditingItem(selectedItem)} approvalRequest={approvalRequest} />;

  const kpis = [
    { icon: <Box size={20} />, label: 'Total Fabrics', value: fabrics.length || 156, detail: 'Items in inventory', tone: 'gold' },
    { icon: <AlertTriangle size={20} />, label: 'Low Stock', value: fabrics.filter((f) => stockStatus(f) === 'Low Stock').length || 8, detail: 'Items below threshold', tone: 'orange' },
    { icon: <XCircle size={20} />, label: 'Out of Stock', value: fabrics.filter((f) => stockStatus(f) === 'Out of Stock').length || 5, detail: 'Items unavailable', tone: 'red' },
    { icon: <Layers size={20} />, label: 'Total Stock', value: `${totalStock.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`, detail: 'Across all fabrics', tone: 'blue' },
  ];

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} />
          <div>
            <h2>Inventory</h2>
            <p>Manage fabric stock levels and track availability</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#fff', border: '1px solid #ddd5c8', borderRadius: 8, color: '#5a4e42', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Download size={14} /> Export
          </button>
          {ownerMode
            ? (
              <button
                onClick={() => setShowApprovals(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Edit2 size={14} /> Review Edit Requests
              </button>
            )
            : (
              <button
                onClick={() => setReceiveOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <PlusCircle size={14} /> Receive New Stock
              </button>
            )}
        </div>
      </div>

      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0faf4', border: '1px solid #b8e4cb', borderRadius: 8, color: '#2a7d4f', fontSize: 13, fontWeight: 500 }}>
          {message}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="kpi-carousel-wrap">
        <section className="inventory-list-kpis" ref={kpiRef} onScroll={handleKpiScroll}>
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
        <div className="kpi-scroll-dots">
          {kpis.map((_, i) => (
            <span key={i} className={i === activeDot ? 'dot-active' : ''} />
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="os-card">
        <div className="os-card-body" style={{ gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff' }}>
              <Search size={14} style={{ color: '#b0a090', flexShrink: 0 }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search fabric, category or code..."
                style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1a1611', background: 'transparent', flex: 1 }}
              />
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              style={{ padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' }}
            >
              <option>All Categories</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={{ padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' }}
            >
              <option>All Statuses</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <button
              onClick={() => { setSearch(''); setCategory('All Categories'); setStatus('All Statuses'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <RefreshCw size={12} /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee5da', background: '#fff' }} className="inventory-table-desktop">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Fabric Name', 'Category', 'Color', 'In Stock', 'Unit', 'Status', 'Last Updated', ''].map((col) => (
                <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '11px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #eee5da' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#8a7a6a', fontSize: 14 }}>
                  <Boxes size={32} style={{ display: 'block', margin: '0 auto 10px', color: '#ddd5c8' }} />
                  No fabrics found. Try adjusting filters or add new stock.
                </td>
              </tr>
            ) : filtered.slice(0, 8).map((fabric, index) => {
              const itemStatus = stockStatus(fabric);
              return (
                <tr
                  key={fabric.id || fabric.code}
                  className="clickable-item-row"
                  onClick={() => setSelectedItem(fabric)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`inventory-fabric-swatch fabric-${index}`} style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0 }} />
                      <span>
                        <div style={{ fontWeight: 600, color: '#1a1611' }}>{fabric.name}</div>
                        <div style={{ fontSize: 11, color: '#8a7a6a', fontFamily: 'monospace', marginTop: 2 }}>{fabric.code || fabric.sku || `FAB-${String(index + 1).padStart(3, '0')}`}</div>
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{fabric.type}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorDot(fabric.color), border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                      <span style={{ color: '#5a4e42' }}>{fabric.color || 'Natural'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <strong style={{ fontSize: 14, color: itemStatus === 'Out of Stock' ? '#8a3520' : itemStatus === 'Low Stock' ? '#7a6030' : '#1a1611' }}>
                      {Number(fabric.quantity || 0).toFixed(1)}
                    </strong>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#8a7a6a' }}>{fabric.unit || 'm'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <Status>{itemStatus}</Status>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#8a7a6a' }}>
                    {fabric.updatedAt ? new Date(fabric.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(fabric); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4e42', fontSize: 12 }}
                      >
                        <Eye size={12} /> View
                      </button>
                      {!ownerMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingItem(fabric); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4e42', fontSize: 12 }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3ede5', background: '#faf7f3' }}>
            <span style={{ fontSize: 12, color: '#8a7a6a' }}>Showing {filtered.length ? 1 : 0}–{Math.min(8, filtered.length)} of {fabrics.length || 156} items</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['‹', '1', '2', '3', '20', '›'].map((label, i) => (
                <button key={i} style={{ minWidth: 30, height: 30, border: '1px solid #ddd5c8', borderRadius: 6, background: label === '1' ? '#1a1611' : '#fff', color: label === '1' ? '#fff' : '#5a4e42', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="inventory-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
        {filtered.slice(0, 8).map((fabric, index) => {
          const itemStatus = stockStatus(fabric);
          return (
            <div
              key={fabric.id || fabric.code}
              className="os-card"
              onClick={() => setSelectedItem(fabric)}
              style={{ cursor: 'pointer' }}
            >
              <div className="os-card-head">
                <span className={`inventory-fabric-swatch fabric-${index}`} style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0 }} />
                <div>
                  <strong>{fabric.name}</strong>
                  <p>{fabric.code || fabric.sku || `FAB-${String(index + 1).padStart(3, '0')}`} · {fabric.type}</p>
                </div>
                <Status>{itemStatus}</Status>
              </div>
              <div className="os-card-body">
                <div className="os-grid-3" style={{ gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>In Stock</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: itemStatus === 'Out of Stock' ? '#8a3520' : itemStatus === 'Low Stock' ? '#7a6030' : '#1a1611', marginTop: 3 }}>
                      {Number(fabric.quantity || 0).toFixed(1)} {fabric.unit || 'm'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorDot(fabric.color), border: '1px solid rgba(0,0,0,0.1)' }} />
                      <span style={{ fontSize: 12, color: '#5a4e42' }}>{fabric.color || 'Natural'}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Updated</div>
                    <div style={{ fontSize: 12, color: '#5a4e42', marginTop: 3 }}>
                      {fabric.updatedAt ? new Date(fabric.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Recently'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Receive Stock Modal */}
      {receiveOpen && (
        <div className="receive-stock-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,17,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form
            onSubmit={submitStock}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #eee5da', background: '#faf7f3' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1611', fontFamily: 'var(--font-display)' }}>Receive New Stock</div>
                <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>Record a new fabric delivery in inventory.</div>
              </div>
              <button type="button" onClick={() => setReceiveOpen(false)} style={{ width: 28, height: 28, border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16, color: '#8a7a6a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className="os-field">
                <span>Fabric Name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Black Jacquard" />
              </label>
              <label className="os-field">
                <span>Category</span>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {['Suiting', 'Shirting', 'Dress', 'Native Wear', 'Casual Wear'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <div className="os-grid-2">
                <label className="os-field">
                  <span>Quantity</span>
                  <input type="number" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required placeholder="0.0" />
                </label>
                <label className="os-field">
                  <span>Unit</span>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    <option value="m">Metres (m)</option>
                    <option value="yd">Yards (yd)</option>
                  </select>
                </label>
              </div>
              <label className="os-field">
                <span>Supplier</span>
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name (optional)" />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '14px 22px 20px', borderTop: '1px solid #eee5da' }}>
              <button type="button" onClick={() => setReceiveOpen(false)} style={{ flex: 1, padding: '11px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button type="submit" style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 8, background: '#1a1611', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Receive Stock</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .inventory-table-desktop { display: none !important; }
          .inventory-mobile-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
