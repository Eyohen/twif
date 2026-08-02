import { useEffect, useMemo, useState } from 'react';
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

  return <div className="inventory-list-page">
    <header className="inventory-list-action">{ownerMode ? <button onClick={() => setShowApprovals(true)}>✓ &nbsp; Review Edit Requests</button> : <button onClick={() => setReceiveOpen(true)}>＋ &nbsp; Receive New Stock</button>}</header>
    {message && <div className="invoice-message">{message}</div>}
    <section className="inventory-list-filters"><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fabric, category or code..." /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>All Categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option>All Statuses</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select></label><label>Stock Status<select><option>All</option></select></label><button onClick={() => { setSearch(''); setCategory('All Categories'); setStatus('All Statuses'); }}>↻ &nbsp; Clear Filters</button><button>⇩ &nbsp; Export</button></section>
    <section className="inventory-list-kpis">{[['▱', 'Total Fabrics', fabrics.length || 156, 'Items', 'gold'], ['△', 'Low Stock', fabrics.filter((f) => stockStatus(f) === 'Low Stock').length || 8, 'Items', 'orange'], ['×', 'Out of Stock', fabrics.filter((f) => stockStatus(f) === 'Out of Stock').length || 5, 'Items', 'red'], ['◇', 'Total Stock', totalStock.toLocaleString(undefined, { maximumFractionDigits: 1 }), 'Across all fabrics', 'blue']].map(([icon, label, value, detail, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}{label === 'Total Stock' ? ' m' : ''}</strong><p>{detail}</p></span></article>)}</section>
    <section className="inventory-list-table"><table><thead><tr><th>Item</th><th>Category</th><th>Color</th><th>Total Stock</th><th>Unit</th><th>Status</th><th>Last Updated</th></tr></thead><tbody>{filtered.slice(0, 8).map((fabric, index) => { const itemStatus = stockStatus(fabric); return <tr className="clickable-item-row" onClick={() => setSelectedItem(fabric)} key={fabric.id || fabric.code}><td><i className={`inventory-fabric-swatch fabric-${index}`}/><span><strong>{fabric.name}</strong><small>{fabric.code || fabric.sku || `FAB-${String(index + 1).padStart(3, '0')}`}</small></span></td><td>{fabric.type}</td><td><i className="color-dot" style={{ background: fabric.color?.toLowerCase().replace('navy blue', '#193454') || '#777' }}/>{fabric.color || 'Natural'}</td><td><strong>{Number(fabric.quantity || 0).toFixed(1)}</strong></td><td>{fabric.unit || 'm'}</td><td><Status>{itemStatus}</Status></td><td>{fabric.updatedAt ? new Date(fabric.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently'}</td></tr>; })}</tbody></table><footer><span>Showing {filtered.length ? 1 : 0} to {Math.min(8, filtered.length)} of {fabrics.length || 156} items</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>20</button><button>›</button></div></footer></section>
    {receiveOpen && <div className="receive-stock-backdrop"><form onSubmit={submitStock}><button type="button" onClick={() => setReceiveOpen(false)}>×</button><h2>Receive New Stock</h2><p>Record a new fabric delivery in inventory.</p><label>Fabric Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Category<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['Suiting', 'Shirting', 'Dress', 'Native Wear', 'Casual Wear'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Quantity<input type="number" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></label><label>Supplier<input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></label><footer><button type="button" onClick={() => setReceiveOpen(false)}>Cancel</button><button>Receive Stock</button></footer></form></div>}
  </div>;
}
