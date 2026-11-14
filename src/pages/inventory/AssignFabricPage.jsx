import { useMemo, useState } from 'react';
import { ArrowLeft, Package, ChevronRight, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoment, isInvoiceApproved } from '../../utils/oms';
import { formatInventoryNumber } from './item';

const th = { textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '9px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #eee5da' };
const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' };

const READY = ['Ready', 'Ready for Collection'];
const storeKeyOf = (invoice) => String(invoice.storeKey || invoice.store || '').trim().toLowerCase().replace(/\s+store$/i, '').replace(/[^a-z0-9]+/g, '-');

// How much of a fabric the order's own store holds. A store with no per-store
// figures falls back to the total, which is how the server reads it too.
const availableAt = (fabric, storeKey) => {
  const balances = fabric.stockByStore || {};
  return Object.keys(balances).length ? Number(balances[storeKey] || 0) : Number(fabric.quantity || 0);
};

// What still needs doing on an order: the garments whose fabric has not yet
// been released. A garment with client-supplied fabric needs nothing from stock.
const garmentsOf = (invoice) => {
  const sheet = invoice.orderSheet || {};
  return Array.isArray(sheet.items) ? sheet.items : [];
};
export const ordersNeedingFabric = (invoices) => invoices.filter((invoice) => {
  const sheet = invoice.orderSheet || {};
  return isInvoiceApproved(invoice) && sheet.status && !READY.includes(sheet.status)
    && garmentsOf(invoice).some((item) => !item.fabricAllocated);
});

// The Inventory Officer releases fabric to Production, so this is where they
// choose which fabric each garment takes, how much, and let it go. Releasing
// takes it out of stock and cannot be undone from here.
export default function AssignFabricPage({ invoices, inventory, loading, onBack, onChanged }) {
  // Orders Production has already chosen fabric for come first.
  const requested = (invoice) => garmentsOf(invoice).some((item) => !item.fabricAllocated && item.fabricRequest?.status === 'Pending');
  const orders = useMemo(() => [...ordersNeedingFabric(invoices)].sort((a, b) => Number(requested(b)) - Number(requested(a))), [invoices]);
  const [openNumber, setOpenNumber] = useState('');
  const open = orders.find((invoice) => invoice.invoiceNumber === openNumber)
    || invoices.find((invoice) => invoice.invoiceNumber === openNumber);

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Package size={22} />
          <div>
            <button type="button" onClick={open ? () => setOpenNumber('') : onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, marginBottom: 5, border: 'none', background: 'none', color: '#8a7a6a', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              <ArrowLeft size={13} /> {open ? 'Assign Fabric' : 'Inventory Overview'}
            </button>
            <h2>{open ? `Assign Fabric · ${open.invoiceNumber}` : 'Assign Fabric'}</h2>
            <p>{open
              ? `${open.customer} · ${open.store || ''}`
              : `Approved orders with fabric still to release · ${orders.length} order${orders.length === 1 ? '' : 's'}`}</p>
          </div>
        </div>
      </div>

      {open ? (
        <OrderFabric invoice={open} inventory={inventory} onChanged={onChanged} />
      ) : (
        <div className="os-card">
          <div className="os-card-head">
            <Package size={15} style={{ color: '#c0a87a' }} />
            <div><strong>Orders Awaiting Fabric</strong><p>Pick an order, choose the fabric for each garment, then release it</p></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {orders.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>{['Invoice', 'Customer', 'Garments', 'Tailor', 'Delivery', ''].map((col) => <th key={col} style={th}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {orders.map((invoice) => {
                    const garments = garmentsOf(invoice);
                    const pending = garments.filter((item) => !item.fabricAllocated);
                    const tailors = [...new Set(garments.flatMap((item) => item.tailors || []).filter(Boolean))];
                    return (
                      <tr key={invoice.invoiceNumber}>
                        <td style={{ ...td, fontFamily: 'monospace', color: '#5a4e42' }}>{invoice.invoiceNumber}</td>
                        <td style={{ ...td, fontWeight: 600, color: '#1a1611' }}>{invoice.customer}</td>
                        <td style={{ ...td, color: '#5a4e42' }}>
                          {pending.map((item) => item.item).filter(Boolean).join(', ') || `${pending.length} garment${pending.length === 1 ? '' : 's'}`}
                          {pending.some((item) => item.fabricRequest?.status === 'Pending') ? (
                            <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: '#fffbf0', border: '1px solid #e8d9a0', color: '#7a6030', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Awaiting your approval</span>
                          ) : null}
                        </td>
                        <td style={{ ...td, color: tailors.length ? '#5a4e42' : '#b0a090' }}>{tailors.join(', ') || 'Not assigned yet'}</td>
                        <td style={{ ...td, color: '#8a7a6a', whiteSpace: 'nowrap' }}>{invoice.orderSheet?.delivery ? formatMoment(invoice.orderSheet.delivery) : '—'}</td>
                        <td style={td}>
                          <button type="button" onClick={() => setOpenNumber(invoice.invoiceNumber)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', border: 'none', borderRadius: 6, background: '#1a1611', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Assign Fabric <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, padding: '40px 16px', textAlign: 'center', fontSize: 13, color: '#8a7a6a' }}>
                {loading ? 'Loading orders…' : 'Nothing is waiting for fabric. Orders appear here once Accounts approve them and an order sheet exists.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderFabric({ invoice, inventory, onChanged }) {
  const sheet = invoice.orderSheet || {};
  const storeKey = storeKeyOf(invoice);
  const garments = garmentsOf(invoice);
  // What is being typed, per garment, before it is saved.
  const [drafts, setDrafts] = useState(() => Object.fromEntries(garments.map((item, index) => [index, (item.fabrics || []).map((line) => ({ ...line }))])));
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  // One search box per garment, matching on SKU, name or type.
  const [searches, setSearches] = useState({});

  const setLine = (index, position, changes) => setDrafts((current) => ({
    ...current,
    [index]: current[index].map((line, at) => (at === position ? { ...line, ...changes } : line)),
  }));
  const removeLine = (index, position) => setDrafts((current) => ({ ...current, [index]: current[index].filter((_, at) => at !== position) }));
  const addLine = (index, fabricId) => {
    if (!fabricId) return;
    const fabric = inventory.find((entry) => String(entry.id) === String(fabricId));
    if (!fabric || (drafts[index] || []).some((line) => String(line.fabricId) === String(fabric.id))) return;
    const department = (garments[index].departments || [])[0];
    setDrafts((current) => ({
      ...current,
      [index]: [...(current[index] || []), { fabricId: fabric.id, name: fabric.name, unit: fabric.unit, quantity: '', ...(department ? { departmentKey: department } : {}) }],
    }));
  };

  const payloadLines = (index) => (drafts[index] || []).map((line) => (line.clientSupplied
    ? { clientSupplied: true, ...(line.privateSupplied ? { privateSupplied: true } : {}), ...(line.departmentKey ? { departmentKey: line.departmentKey } : {}) }
    : { fabricId: line.fabricId, quantity: Number(line.quantity), ...(line.departmentKey ? { departmentKey: line.departmentKey } : {}) }));

  const save = async (index) => {
    const response = await api.patch(`/oms/jobs/${invoice.invoiceNumber}/fabrics`, { items: [{ index, fabrics: payloadLines(index) }] });
    return response.data?.data?.orderSheet;
  };

  const run = async (index, release) => {
    const item = garments[index];
    const lines = (drafts[index] || []);
    const stockLines = lines.filter((line) => !line.clientSupplied);
    setNotice(null);
    if (!lines.length) { setNotice({ error: true, text: `Choose the fabric ${item.item || 'this garment'} needs.` }); return; }
    if (stockLines.some((line) => !(Number(line.quantity) > 0))) { setNotice({ error: true, text: 'Say how much of each fabric is needed.' }); return; }
    const short = stockLines.find((line) => {
      const fabric = inventory.find((entry) => String(entry.id) === String(line.fabricId));
      return fabric && Number(line.quantity) > availableAt(fabric, storeKey);
    });
    if (release && short) { setNotice({ error: true, text: `There is not enough ${short.name} at this store to release that much.` }); return; }
    const tailor = (item.tailors || [])[0];
    if (release && stockLines.length && !tailor) { setNotice({ error: true, text: 'Production has not assigned a tailor to this garment yet. Fabric is released once there is one.' }); return; }

    setBusy(`${release ? 'release' : 'save'}-${index}`);
    try {
      const saved = await save(index);
      let allocated = null;
      if (release && stockLines.length) {
        const response = await api.post('/oms/fabrics/allocate', {
          fabrics: stockLines.map((line) => ({ fabricId: line.fabricId, quantity: Number(line.quantity) })),
          trackingToken: sheet.trackingToken || invoice.trackingToken,
          tailorName: tailor,
          itemIndex: index,
          itemName: item.item || `Item ${index + 1}`,
        });
        allocated = response.data?.data?.allocated || [];
      }
      await onChanged?.(invoice.invoiceNumber, saved, allocated);
      setNotice({
        error: false,
        text: release
          ? (allocated ? `${allocated.map((line) => `${line.quantity} ${line.unit} of ${line.name}`).join(', ')} released for ${item.item || `item ${index + 1}`}.` : `Client-supplied fabric noted for ${item.item || `item ${index + 1}`}.`)
          : `Fabric selection saved for ${item.item || `item ${index + 1}`}.`,
      });
    } catch (error) {
      setNotice({ error: true, text: error.response?.data?.message || 'That could not be saved.' });
    } finally {
      setBusy('');
    }
  };

  // Refreshed from the list once a garment has been released.
  const fresh = garmentsOf(invoice);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {notice ? (
        <div className={`os-message ${notice.error ? 'os-msg-error' : 'os-msg-success'}`} role="status" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {notice.error ? null : <Check size={15} />}<span>{notice.text}</span>
        </div>
      ) : null}
      {fresh.map((item, index) => {
        const released = Boolean(item.fabricAllocated);
        const lines = drafts[index] || [];
        const tailor = (item.tailors || []).join(', ');
        return (
          <div className="os-card" key={`${item.item}-${index}`}>
            <div className="os-card-head">
              <span className="os-step-num">{index + 1}</span>
              <div>
                <strong>{item.item || `Item ${index + 1}`}</strong>
                <p>{(Number(item.pieces) || 1)} piece{(Number(item.pieces) || 1) === 1 ? '' : 's'} · Tailor: {tailor || 'not assigned yet'}{item.delivery ? ` · Delivery ${formatMoment(item.delivery)}` : ''}</p>
              </div>
              {released ? <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 10, background: '#f0faf4', color: '#2a7d4f', fontSize: 11, fontWeight: 700 }}>Released</span> : null}
            </div>
            <div className="os-card-body" style={{ display: 'grid', gap: 10 }}>
              {!released && item.fabricRequest?.status === 'Pending' ? (
                <p style={{ margin: 0, padding: '8px 12px', borderRadius: 8, background: '#fffbf0', border: '1px solid #e8d9a0', color: '#7a6030', fontSize: 13, fontWeight: 600 }}>
                  {item.fabricRequest.requestedBy || 'Production'} chose the fabric below and is waiting for your approval. Check it, then approve and release it.
                </p>
              ) : null}
              {released ? (
                <p style={{ margin: 0, fontSize: 13, color: '#5a4e42' }}>
                  {(item.fabricAllocations || []).map((line) => `${line.quantity} ${line.unit} of ${line.name}`).join(', ') || 'Fabric has been released for this garment.'}
                </p>
              ) : (
                <>
                  {lines.length ? lines.map((line, position) => {
                    const fabric = inventory.find((entry) => String(entry.id) === String(line.fabricId));
                    const have = fabric ? availableAt(fabric, storeKey) : null;
                    return (
                      <div key={`${line.fabricId || 'client'}-${position}`} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ minWidth: 160, fontSize: 13 }}>{line.clientSupplied ? (line.privateSupplied ? 'Private supplied' : 'Client supplied') : `${fabric?.sku ? `${fabric.sku} · ` : ''}${line.name}`}</strong>
                        {line.clientSupplied ? <span style={{ fontSize: 12, color: '#8a7a6a' }}>Nothing is taken from stock.</span> : (
                          <>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <input type="number" min="0" step="0.01" value={line.quantity} aria-label={`How much ${line.name} this garment needs`} onChange={(event) => setLine(index, position, { quantity: event.target.value })} style={{ width: 110 }} />
                              <span style={{ fontSize: 12, color: '#8a7a6a' }}>{line.unit || 'units'}</span>
                            </label>
                            {have !== null ? <small style={{ color: Number(line.quantity) > have ? '#8a3520' : '#8a7a6a' }}>{formatInventoryNumber(have)} {line.unit} at this store</small> : null}
                          </>
                        )}
                        <button type="button" onClick={() => removeLine(index, position)} aria-label={`Remove ${line.name || 'client supplied fabric'}`} style={{ marginLeft: 'auto', padding: '3px 9px', border: '1px solid #f3d5cc', borderRadius: 6, background: '#fff5f0', color: '#8a3520', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                      </div>
                    );
                  }) : <p style={{ margin: 0, fontSize: 13, color: '#b0a090' }}>No fabric chosen for this garment yet.</p>}
                  <label className="os-field" style={{ maxWidth: 360 }}>
                    <span>Add fabric</span>
                    <input
                      type="search"
                      value={searches[index] || ''}
                      onChange={(event) => setSearches((current) => ({ ...current, [index]: event.target.value }))}
                      placeholder="Search fabric by SKU or name…"
                      aria-label={`Search fabric for ${item.item || `item ${index + 1}`}`}
                    />
                    <select value="" onChange={(event) => { addLine(index, event.target.value); setSearches((current) => ({ ...current, [index]: '' })); }} aria-label={`Add fabric for ${item.item || `item ${index + 1}`}`}>
                      <option value="">Choose from stock…</option>
                      {inventory
                        .filter((fabric) => !(searches[index] || '').trim() || `${fabric.sku || ''} ${fabric.name} ${fabric.type || ''}`.toLowerCase().includes(searches[index].trim().toLowerCase()))
                        .map((fabric) => {
                          const have = availableAt(fabric, storeKey);
                          return <option key={fabric.id} value={fabric.id} disabled={have <= 0}>{fabric.sku ? `${fabric.sku} · ` : ''}{fabric.name} ({formatInventoryNumber(have)} {fabric.unit}){have <= 0 ? ' · out of stock here' : ''}</option>;
                        })}
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" disabled={Boolean(busy)} onClick={() => run(index, false)} style={{ padding: '8px 16px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff', color: '#1a1611', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {busy === `save-${index}` ? 'Saving…' : 'Save selection'}
                    </button>
                    <button type="button" disabled={Boolean(busy) || !lines.length} onClick={() => run(index, true)} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#1a1611', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: lines.length ? 1 : 0.5 }}>
                      {busy === `release-${index}` ? 'Releasing…' : item.fabricRequest?.status === 'Pending' ? 'Approve & release' : 'Release fabric'}
                    </button>
                  </div>
                  <small style={{ color: '#8a7a6a' }}>Releasing takes the fabric out of this store&apos;s stock and hands it to Production. It cannot be undone from here.</small>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
