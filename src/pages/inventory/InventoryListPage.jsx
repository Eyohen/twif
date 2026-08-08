import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, AlertTriangle, XCircle, Layers, Search, RefreshCw, Download, PlusCircle, Boxes, Eye, Edit2, ChevronRight, ImagePlus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { money } from '../../utils/oms';
import { stockStatus, itemImageUrl, colourSwatch } from './item';
import { Status } from '../../components/oms/Common';
import ItemDetailsPage from './ItemDetailsPage';
import EditItemPage from './EditItemPage';
import OwnerInventoryApprovalsPage from '../owner/InventoryApprovalsPage';

const PAGE_SIZE = 10;
const EMPTY_FORM = { sku: '', name: '', type: '', colour: '', quantity: '', unit: 'yards', cost: '', location: '', supplier: '', lowStockThreshold: '', image: '' };

const selectStyle = {
  padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42',
  background: '#fff', appearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer',
};

export default function InventoryListPage({ currentRole, ownerMode = false }) {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [units, setUnits] = useState(['yards', 'units']);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All Types');
  const [status, setStatus] = useState('All Statuses');
  const [page, setPage] = useState(1);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [newType, setNewType] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [showApprovals, setShowApprovals] = useState(false);
  const kpiRef = useRef(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/oms/fabrics');
      setItems(response.data?.data?.fabrics || []);
      setLoadError('');
    } catch {
      // A failed load used to render eight invented fabrics, which read as a
      // stocked shelf. An empty inventory and an unreachable server are
      // different things and now say so.
      setItems([]);
      setLoadError('Inventory could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    api.get('/oms/inventory-types')
      .then((response) => {
        setTypes(response.data?.data?.types || []);
        setUnits(response.data?.data?.units || ['yards', 'units']);
      })
      .catch(() => setTypes([]));
  }, []);

  // Items filed under a type that has since been renamed or removed still have
  // to be findable, so the filter offers whatever is actually in use as well.
  const filterTypes = useMemo(() => (
    [...new Set([...types, ...items.map((item) => item.type).filter(Boolean)])]
  ), [types, items]);

  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.name} ${item.type} ${item.sku || ''} ${item.colour || ''} ${item.location || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase())
      && (type === 'All Types' || item.type === type)
      && (status === 'All Statuses' || stockStatus(item) === status);
  }), [items, search, type, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const lowStock = items.filter((item) => stockStatus(item) === 'Low Stock');
  const outOfStock = items.filter((item) => stockStatus(item) === 'Out of Stock');
  // Yards and units cannot be added together into one number, so stock value is
  // the honest total across a mixed shelf.
  const stockValue = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0), 0);

  const resetFilters = () => { setSearch(''); setType('All Types'); setStatus('All Statuses'); setPage(1); };

  const readImage = (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setFormError('That photo is larger than 4MB. Please choose a smaller one.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submitStock = async (event) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const response = await api.post('/oms/fabrics', {
        ...form,
        quantity: Number(form.quantity || 0),
        cost: form.cost === '' ? null : Number(form.cost),
        lowStockThreshold: Number(form.lowStockThreshold || 0),
      });
      const created = response.data?.data?.fabric;
      setItems((current) => [...current, { ...created, hasImage: Boolean(created?.image) }].sort((a, b) => a.name.localeCompare(b.name)));
      setReceiveOpen(false);
      setForm(EMPTY_FORM);
      setMessage(`${created?.name || 'Item'} was added to inventory.`);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Unable to save this item.');
    } finally {
      setSaving(false);
    }
  };

  const addType = async () => {
    const name = newType.trim();
    if (!name) return;
    setFormError('');
    try {
      const response = await api.post('/oms/inventory-types', { name });
      setTypes(response.data?.data?.types || []);
      setForm((current) => ({ ...current, type: name }));
      setNewType('');
      setAddingType(false);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Unable to add that type.');
    }
  };

  const exportCsv = () => {
    const header = ['SKU', 'Name', 'Type', 'Colour', 'Quantity', 'Unit', 'Cost', 'Location', 'Supplier', 'Low stock at', 'Status'];
    const rows = filtered.map((item) => [
      item.sku || '', item.name, item.type, item.colour || '', Number(item.quantity || 0), item.unit,
      item.cost ?? '', item.location || '', item.supplier || '', Number(item.lowStockThreshold || 0), stockStatus(item),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `twif-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (showApprovals) return <OwnerInventoryApprovalsPage currentRole={currentRole} onBack={() => setShowApprovals(false)} />;
  if (editingItem) {
    return (
      <EditItemPage
        item={editingItem}
        currentRole={currentRole}
        types={filterTypes}
        onCancel={() => setEditingItem(null)}
        onSaved={(updated) => {
          setItems((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
          setSelectedItem((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
          setEditingItem(null);
          setMessage(`${updated.name} was updated.`);
        }}
        onSubmitted={(request) => { setApprovalRequest(request); setEditingItem(null); }}
      />
    );
  }
  if (selectedItem) {
    return (
      <ItemDetailsPage
        itemId={selectedItem.id}
        fallbackItem={selectedItem}
        onBack={() => setSelectedItem(null)}
        onEdit={ownerMode ? () => setShowApprovals(true) : () => setEditingItem(selectedItem)}
        approvalRequest={approvalRequest}
      />
    );
  }

  const kpis = [
    { icon: <Box size={20} />, label: 'Items', value: items.length, detail: 'Records in inventory', tone: 'gold' },
    { icon: <AlertTriangle size={20} />, label: 'Low Stock', value: lowStock.length, detail: 'At or below threshold', tone: 'orange' },
    { icon: <XCircle size={20} />, label: 'Out of Stock', value: outOfStock.length, detail: 'Nothing left on the shelf', tone: 'red' },
    { icon: <Layers size={20} />, label: 'Stock Value', value: stockValue ? money.format(stockValue) : '—', detail: stockValue ? 'Quantity × unit cost' : 'No costs recorded yet', tone: 'blue' },
  ];

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} />
          <div>
            <h2>Inventory</h2>
            <p>Fabric, trims and materials held across the stores and production</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filtered.length}
            title={filtered.length ? 'Download these items as a CSV' : 'Nothing to export'}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#fff', border: '1px solid #ddd5c8', borderRadius: 8, color: filtered.length ? '#5a4e42' : '#c7bcae', fontSize: 13, fontWeight: 600, cursor: filtered.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            <Download size={14} /> Export
          </button>
          {ownerMode ? (
            <button
              type="button"
              onClick={() => setShowApprovals(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Edit2 size={14} /> Review Edit Requests
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setForm({ ...EMPTY_FORM, type: types[0] || '' }); setFormError(''); setReceiveOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <PlusCircle size={14} /> Add Item
            </button>
          )}
        </div>
      </div>

      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0faf4', border: '1px solid #b8e4cb', borderRadius: 8, color: '#2a7d4f', fontSize: 13, fontWeight: 500 }}>
          {message}
        </div>
      )}
      {loadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fff5f0', border: '1px solid #f0c8b8', borderRadius: 8, color: '#8a3520', fontSize: 13, fontWeight: 500 }}>
          <AlertTriangle size={15} /> {loadError}
          <button type="button" onClick={loadItems} style={{ marginLeft: 'auto', border: '1px solid #f0c8b8', background: '#fff', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#8a3520', cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
        </div>
      )}

      <div className="kpi-carousel-wrap">
        <section className="inventory-list-kpis" ref={kpiRef}>
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

      <div className="os-card">
        <div className="os-card-body" style={{ gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff' }}>
              <Search size={14} style={{ color: '#b0a090', flexShrink: 0 }} />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search name, SKU, colour or location..."
                style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1a1611', background: 'transparent', flex: 1 }}
              />
            </label>
            <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} style={selectStyle}>
              <option>All Types</option>
              {filterTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} style={selectStyle}>
              <option>All Statuses</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
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
              {['Item', 'Type', 'Colour', 'In Stock', 'Unit Cost', 'Location', 'Status', ''].map((col) => (
                <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '11px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #eee5da' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#8a7a6a', fontSize: 14 }}>Loading inventory…</td></tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#8a7a6a', fontSize: 14 }}>
                  <Boxes size={32} style={{ display: 'block', margin: '0 auto 10px', color: '#ddd5c8' }} />
                  {items.length ? 'No items match these filters.' : 'Nothing has been added to inventory yet.'}
                </td>
              </tr>
            ) : visible.map((item) => {
              const itemStatus = stockStatus(item);
              const image = itemImageUrl(item);
              return (
                <tr
                  key={item.id}
                  className="clickable-item-row"
                  onClick={() => setSelectedItem(item)}
                  title={`Open ${item.name}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(event) => { event.currentTarget.style.background = '#faf7f3'; }}
                  onMouseLeave={(event) => { event.currentTarget.style.background = ''; }}
                >
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {image ? (
                        <img src={image} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid #eee5da' }} />
                      ) : (
                        <span style={{ width: 34, height: 34, borderRadius: 6, flexShrink: 0, background: '#faf7f3', border: '1px solid #eee5da', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7bcae' }}>
                          <Box size={15} />
                        </span>
                      )}
                      <span>
                        <div style={{ fontWeight: 600, color: '#1a1611' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#8a7a6a', fontFamily: 'monospace', marginTop: 2 }}>{item.sku || 'No SKU'}</div>
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{item.type}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    {item.colour ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colourSwatch(item.colour), border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                        <span style={{ color: '#5a4e42' }}>{item.colour}</span>
                      </div>
                    ) : <span style={{ color: '#b0a090' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', whiteSpace: 'nowrap' }}>
                    <strong style={{ fontSize: 14, color: itemStatus === 'Out of Stock' ? '#8a3520' : itemStatus === 'Low Stock' ? '#7a6030' : '#1a1611' }}>
                      {Number(item.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </strong>
                    <span style={{ color: '#8a7a6a', marginLeft: 4 }}>{item.unit}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: item.cost ? '#1a1611' : '#b0a090' }}>
                    {item.cost ? money.format(Number(item.cost)) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: item.location ? '#5a4e42' : '#b0a090' }}>
                    {item.location || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <Status>{itemStatus}</Status>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setSelectedItem(item); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4e42', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}
                      >
                        <Eye size={12} /> View
                      </button>
                      {!ownerMode && (
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setEditingItem(item); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4e42', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                      {/* A row opens the item; the chevron is what says so. */}
                      <ChevronRight size={15} style={{ color: '#c7bcae', flexShrink: 0 }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3ede5', background: '#faf7f3', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#8a7a6a' }}>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} items
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['‹', ...Array.from({ length: pageCount }, (_, index) => String(index + 1)), '›'].map((label) => {
                const isArrow = label === '‹' || label === '›';
                const target = label === '‹' ? currentPage - 1 : label === '›' ? currentPage + 1 : Number(label);
                const disabled = target < 1 || target > pageCount;
                const active = !isArrow && target === currentPage;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPage(target)}
                    style={{ minWidth: 30, height: 30, border: '1px solid #ddd5c8', borderRadius: 6, background: active ? '#1a1611' : '#fff', color: active ? '#fff' : disabled ? '#c7bcae' : '#5a4e42', fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >{label}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="inventory-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
        {visible.map((item) => {
          const itemStatus = stockStatus(item);
          const image = itemImageUrl(item);
          return (
            <div
              key={item.id}
              className="os-card inventory-mobile-item"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedItem(item)}
              onKeyDown={(event) => { if (event.key === 'Enter') setSelectedItem(item); }}
              style={{ cursor: 'pointer' }}
            >
              <div className="os-card-head">
                {image ? (
                  <img src={image} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid #eee5da' }} />
                ) : (
                  <span style={{ width: 34, height: 34, borderRadius: 6, flexShrink: 0, background: '#faf7f3', border: '1px solid #eee5da', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7bcae' }}>
                    <Box size={15} />
                  </span>
                )}
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.sku || 'No SKU'} · {item.type}</p>
                </div>
                <Status>{itemStatus}</Status>
              </div>
              <div className="os-card-body">
                <div className="os-grid-3" style={{ gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>In Stock</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: itemStatus === 'Out of Stock' ? '#8a3520' : itemStatus === 'Low Stock' ? '#7a6030' : '#1a1611', marginTop: 3 }}>
                      {Number(item.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colour</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      {item.colour ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: colourSwatch(item.colour), border: '1px solid rgba(0,0,0,0.1)' }} /> : null}
                      <span style={{ fontSize: 12, color: item.colour ? '#5a4e42' : '#b0a090' }}>{item.colour || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</div>
                    <div style={{ fontSize: 12, color: item.location ? '#5a4e42' : '#b0a090', marginTop: 3 }}>{item.location || '—'}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #f3ede5', background: '#faf7f3', color: '#5a4e42', fontSize: 13, fontWeight: 700, borderRadius: '0 0 12px 12px' }}>
                <span>View item</span>
                <ChevronRight size={15} />
              </div>
            </div>
          );
        })}
        {!loading && !visible.length ? (
          <div className="os-card" style={{ padding: '28px 16px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>
            {items.length ? 'No items match these filters.' : 'Nothing has been added to inventory yet.'}
          </div>
        ) : null}
      </div>

      {/* Add Item */}
      {receiveOpen && (
        <div className="receive-stock-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,17,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
          <form
            onSubmit={submitStock}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #eee5da', background: '#faf7f3', position: 'sticky', top: 0 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1611', fontFamily: 'var(--font-display)' }}>Add Inventory Item</div>
                <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>Record what arrived and where it is kept.</div>
              </div>
              <button type="button" onClick={() => setReceiveOpen(false)} style={{ width: 28, height: 28, border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16, color: '#8a7a6a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && (
                <div style={{ padding: '10px 12px', background: '#fff5f0', border: '1px solid #f0c8b8', borderRadius: 8, color: '#8a3520', fontSize: 12.5 }}>{formError}</div>
              )}

              {/* Photo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <label style={{ width: 76, height: 76, borderRadius: 10, border: '1px dashed #ddd5c8', background: '#faf7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  {form.image
                    ? <img src={form.image} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <ImagePlus size={20} style={{ color: '#b0a090' }} />}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => readImage(event.target.files?.[0])} style={{ display: 'none' }} />
                </label>
                <div style={{ fontSize: 12, color: '#8a7a6a', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', color: '#5a4e42', fontSize: 13 }}>Item photo</strong>
                  A picture of the roll or box makes it recognisable on the shelf. PNG, JPEG, WebP or GIF, up to 4MB.
                  {form.image ? (
                    <button type="button" onClick={() => setForm({ ...form, image: '' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, border: '1px solid #ddd5c8', background: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 11.5, color: '#8a3520', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <X size={11} /> Remove photo
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="os-grid-2">
                <label className="os-field">
                  <span>SKU</span>
                  <input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="e.g. FAB-014" />
                </label>
                <label className="os-field">
                  <span>Name</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="e.g. Navy wool suiting" />
                </label>
              </div>

              <div className="os-grid-2">
                <label className="os-field">
                  <span>Type</span>
                  <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} required>
                    <option value="" disabled>Choose a type</option>
                    {types.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="os-field">
                  <span>Colour</span>
                  <input value={form.colour} onChange={(event) => setForm({ ...form, colour: event.target.value })} placeholder="e.g. Navy" />
                </label>
              </div>

              {/* Types are configurable, so a new one can be added without waiting
                  for a deploy. */}
              {addingType ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={newType}
                    onChange={(event) => setNewType(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addType(); } }}
                    placeholder="New type name"
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
                  />
                  <button type="button" onClick={addType} style={{ padding: '9px 14px', border: 'none', borderRadius: 8, background: '#1a1611', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  <button type="button" onClick={() => { setAddingType(false); setNewType(''); }} style={{ padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingType(true)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #ddd5c8', background: '#faf7f3', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  <PlusCircle size={13} /> Add a new type
                </button>
              )}

              <div className="os-grid-3">
                <label className="os-field">
                  <span>Quantity</span>
                  <input type="number" step="0.1" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required placeholder="0" />
                </label>
                <label className="os-field">
                  <span>Unit</span>
                  <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
                    {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </label>
                <label className="os-field">
                  <span>Cost per {form.unit === 'yards' ? 'yard' : 'unit'}</span>
                  <input type="number" step="1" min="0" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} placeholder="₦" />
                </label>
              </div>

              <div className="os-grid-2">
                <label className="os-field">
                  <span>Location</span>
                  <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Ikeja store, rack 2" />
                </label>
                <label className="os-field">
                  <span>Low stock at</span>
                  <input type="number" step="0.1" min="0" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })} placeholder="0" />
                </label>
              </div>

              <label className="os-field">
                <span>Supplier</span>
                <input value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} placeholder="Supplier name (optional)" />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '14px 22px 20px', borderTop: '1px solid #eee5da' }}>
              <button type="button" onClick={() => setReceiveOpen(false)} style={{ flex: 1, padding: '11px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#5a4e42', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 8, background: saving ? '#8a7a6a' : '#1a1611', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Add Item'}
              </button>
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
